import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { cancelarSePendente } from 'src/common/estoque-pedido';
import { PrismaService } from 'src/prisma/services/prisma.service';

// Pedido PENDENTE há mais que isso é considerado abandonado.
const PRAZO_HORAS = 24;
const INTERVALO_MS = 30 * 60 * 1000;

/**
 * Quem desiste no Mercado Pago não gera aviso nenhum, e o pedido ficaria
 * PENDENTE para sempre segurando as peças no estoque. A cada 30 min, cancela
 * os pendentes com mais de 24h e devolve as peças. Se um pagamento desses
 * ainda for aprovado depois (boleto pago no 2º dia, por exemplo), o webhook
 * reabre o pedido e tira as peças de novo (ver common/estoque-pedido.ts).
 */
@Injectable()
export class PedidosExpiradosService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PedidosExpiradosService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prismaService: PrismaService) {}

  onModuleInit() {
    // Não roda nos testes nem quando desligado explicitamente.
    if (process.env.NODE_ENV === 'test' || process.env.CANCELAR_PEDIDOS_EXPIRADOS === 'false') {
      return;
    }
    this.timer = setInterval(() => void this.cancelarExpirados(), INTERVALO_MS);
    setTimeout(() => void this.cancelarExpirados(), 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async cancelarExpirados(): Promise<number> {
    try {
      const limite = new Date(Date.now() - PRAZO_HORAS * 60 * 60 * 1000);
      const expirados = await this.prismaService.pEDIDOS.findMany({
        where: { TP_STATUS: 'PENDENTE', TS_CRIACAO: { lt: limite } },
        select: { CD_PEDIDO: true },
      });

      let cancelados = 0;
      for (const { CD_PEDIDO } of expirados) {
        const ok = await cancelarSePendente(this.prismaService, CD_PEDIDO);
        if (ok) cancelados++;
      }

      if (cancelados > 0) {
        this.logger.log(
          `${cancelados} pedido(s) pendente(s) há mais de ${PRAZO_HORAS}h cancelado(s); estoque devolvido.`,
        );
      }
      return cancelados;
    } catch (err) {
      // Banco fora do ar numa rodada não pode derrubar a API; tenta na próxima.
      this.logger.error(`Falha ao cancelar pedidos expirados: ${err}`);
      return 0;
    }
  }
}
