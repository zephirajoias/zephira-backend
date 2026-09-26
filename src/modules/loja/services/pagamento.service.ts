import { Injectable, Logger } from '@nestjs/common';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { STATUS_PEDIDO } from '@prisma/client';
import { PrismaService } from 'src/prisma/services/prisma.service';
import { EmailService } from 'src/common/email/email.service';
import { acertarEstoqueDoPedido } from 'src/common/estoque-pedido';

interface ItemPreferencia {
  CD_PEDIDO: number;
  ITENS_PEDIDO: {
    NM_PRODUTO_SNAPSHOT: string;
    QT_ITEM: number;
    VL_UNITARIO: number;
  }[];
  VL_TOTAL: number;
}

const STATUS_JA_PAGO: STATUS_PEDIDO[] = [
  'PAGO',
  'PROCESSANDO',
  'ENVIADO',
  'ENTREGUE',
  'DEVOLVIDO',
];

const STATUS_MP_PARA_PEDIDO: Record<string, STATUS_PEDIDO> = {
  approved: 'PAGO',
  pending: 'PENDENTE',
  in_process: 'PENDENTE',
  authorized: 'PENDENTE',
  rejected: 'CANCELADO',
  cancelled: 'CANCELADO',
  refunded: 'DEVOLVIDO',
  charged_back: 'DEVOLVIDO',
};

@Injectable()
export class PagamentoService {
  private readonly logger = new Logger(PagamentoService.name);
  private readonly client: MercadoPagoConfig | null;
  private readonly isConfigured: boolean;
  private readonly isSandbox: boolean;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService,
  ) {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    this.isConfigured = Boolean(accessToken);
    this.isSandbox = process.env.MERCADO_PAGO_SANDBOX !== 'false';

    if (!this.isConfigured) {
      this.logger.warn(
        'Pagamento via Mercado Pago desabilitado: MERCADO_PAGO_ACCESS_TOKEN não configurado.',
      );
      this.client = null;
      return;
    }

    this.client = new MercadoPagoConfig({ accessToken: accessToken! });
  }

  async criarPreferencia(pedido: ItemPreferencia): Promise<{
    preferenceId: string;
    checkoutUrl: string | null;
  } | null> {
    if (!this.client) return null;

    const preference = new Preference(this.client);
    const frontendUrl =
      process.env.USER_FRONTEND_URL ?? 'https://www.zephirajoias.com.br';
    const backendUrl =
      process.env.BACKEND_URL ?? 'https://zephira-backend.onrender.com';

    const result = await preference.create({
      body: {
        items: pedido.ITENS_PEDIDO.map((item) => ({
          id: String(pedido.CD_PEDIDO),
          title: item.NM_PRODUTO_SNAPSHOT,
          quantity: item.QT_ITEM,
          unit_price: Number(item.VL_UNITARIO),
          currency_id: 'BRL',
        })),
        external_reference: String(pedido.CD_PEDIDO),
        back_urls: {
          success: `${frontendUrl}/minha-conta?pedido=${pedido.CD_PEDIDO}`,
          pending: `${frontendUrl}/minha-conta?pedido=${pedido.CD_PEDIDO}`,
          failure: `${frontendUrl}/carrinho`,
        },
        auto_return: 'approved',
        notification_url: `${backendUrl}/pagamentos/webhook`,
      },
    });

    return {
      preferenceId: result.id!,
      checkoutUrl:
        (this.isSandbox ? result.sandbox_init_point : result.init_point) ??
        result.init_point ??
        null,
    };
  }

  async processarWebhook(paymentId: string): Promise<void> {
    if (!this.client) return;

    const payment = new Payment(this.client);
    const dadosPagamento = await payment.get({ id: paymentId });

    const cdPedido = Number(dadosPagamento.external_reference);
    if (!cdPedido || isNaN(cdPedido)) {
      this.logger.warn(
        `Webhook do Mercado Pago sem external_reference válido (payment ${paymentId}).`,
      );
      return;
    }

    const novoStatus = STATUS_MP_PARA_PEDIDO[dadosPagamento.status ?? ''];
    if (!novoStatus) {
      this.logger.warn(
        `Status de pagamento desconhecido: ${dadosPagamento.status} (payment ${paymentId})`,
      );
      return;
    }

    const pedido = await this.prismaService.pEDIDOS.findUnique({
      where: { CD_PEDIDO: cdPedido },
    });

    if (!pedido) {
      this.logger.warn(
        `Webhook do Mercado Pago referencia pedido inexistente: ${cdPedido}`,
      );
      return;
    }

    // Só aceita "aprovado" se o valor pago cobre o total do pedido. Um
    // pagamento menor (preferência adulterada, por exemplo) não vira PAGO.
    const valorPago = Number(dadosPagamento.transaction_amount ?? 0);
    if (novoStatus === 'PAGO' && valorPago + 0.01 < Number(pedido.VL_TOTAL)) {
      this.logger.error(
        `Pagamento ${paymentId} aprovado com R$ ${valorPago}, mas o pedido #${cdPedido} custa R$ ${pedido.VL_TOTAL}. Pedido NÃO marcado como pago; conferir no Mercado Pago.`,
      );
      return;
    }

    // Pedido já pago (ou mais adiante) não volta pra PENDENTE/CANCELADO por
    // causa do aviso atrasado de uma tentativa de pagamento que falhou.
    if (
      pedido.TP_STATUS &&
      STATUS_JA_PAGO.includes(pedido.TP_STATUS) &&
      (novoStatus === 'PENDENTE' || novoStatus === 'CANCELADO')
    ) {
      this.logger.warn(
        `Webhook ignorado: pedido #${cdPedido} já está ${pedido.TP_STATUS}, payment ${paymentId} veio ${dadosPagamento.status}.`,
      );
      return;
    }

    const atualizou = await this.prismaService.$transaction(async (tx) => {
      // Só grava se o status ainda for o que foi lido: o Mercado Pago repete
      // avisos, e dois ao mesmo tempo não podem devolver o estoque duas vezes.
      const { count } = await tx.pEDIDOS.updateMany({
        where: { CD_PEDIDO: cdPedido, TP_STATUS: pedido.TP_STATUS },
        data: {
          TP_STATUS: novoStatus,
          TP_METODO_PAGAMENTO: dadosPagamento.payment_type_id ?? undefined,
          TS_ATUALIZACAO: new Date(),
        },
      });
      if (count === 0) return false;
      await acertarEstoqueDoPedido(tx, cdPedido, pedido.TP_STATUS, novoStatus);
      return true;
    });

    if (!atualizou) {
      this.logger.warn(
        `Pedido #${cdPedido} mudou durante o webhook (payment ${paymentId}); aviso ignorado.`,
      );
      return;
    }

    if (novoStatus === 'PAGO' && pedido.TP_STATUS !== 'PAGO') {
      void this.emailService.avisarPedido(cdPedido, 'pago');
    }

    this.logger.log(
      `Pedido #${cdPedido} atualizado para ${novoStatus} via webhook (payment ${paymentId}).`,
    );
  }
}
