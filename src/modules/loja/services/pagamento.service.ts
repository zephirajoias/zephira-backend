import { Injectable, Logger } from '@nestjs/common';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { PrismaService } from 'src/prisma/services/prisma.service';

interface ItemPreferencia {
  CD_PEDIDO: number;
  ITENS_PEDIDO: {
    NM_PRODUTO_SNAPSHOT: string;
    QT_ITEM: number;
    VL_UNITARIO: number;
  }[];
  VL_TOTAL: number;
}

const STATUS_MP_PARA_PEDIDO: Record<string, string> = {
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

  constructor(private readonly prismaService: PrismaService) {
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

    await this.prismaService.pEDIDOS.update({
      where: { CD_PEDIDO: cdPedido },
      data: {
        TP_STATUS: novoStatus as any,
        TP_METODO_PAGAMENTO: dadosPagamento.payment_type_id ?? undefined,
        TS_ATUALIZACAO: new Date(),
      },
    });

    this.logger.log(
      `Pedido #${cdPedido} atualizado para ${novoStatus} via webhook (payment ${paymentId}).`,
    );
  }
}
