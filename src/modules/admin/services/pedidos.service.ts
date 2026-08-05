import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/services/prisma.service';
import { SuperFreteService } from 'src/modules/loja/services/superfrete.service';
import { UpdatePedidoStatusDto } from '../dto/update-pedido-status.dto';

@Injectable()
export class PedidosService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly superFreteService: SuperFreteService,
  ) {}

  async listaPedidos(page: number, limit: number): Promise<any> {
    const skip = (page - 1) * limit;

    const [pedidos, total] = await this.prismaService.$transaction([
      this.prismaService.pEDIDOS.findMany({
        skip,
        take: limit,
        orderBy: { TS_CRIACAO: 'desc' },
        include: {
          USUARIO: {
            select: { NM_USUARIO: true, DS_EMAIL: true },
          },
        },
      }),
      this.prismaService.pEDIDOS.count(),
    ]);

    return {
      data: pedidos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async pedidoDetalhes(cd_pedido: number): Promise<any> {
    const idPedido = Number(cd_pedido);

    if (isNaN(idPedido) || idPedido <= 0) {
      throw new BadRequestException(`ID do pedido inválido: ${cd_pedido}`);
    }

    const pedido = await this.prismaService.pEDIDOS.findUnique({
      where: { CD_PEDIDO: idPedido },
      include: {
        USUARIO: {
          select: {
            CD_USUARIO: true,
            NM_USUARIO: true,
            DS_EMAIL: true,
            NR_TELEFONE: true,
          },
        },
        ITENS_PEDIDO: {
          include: {
            VARIACOES_PRODUTO: {
              select: {
                CD_VARIACAO: true,
                DS_TAMANHO: true,
                CD_SKU: true,
                PRODUTOS: {
                  select: {
                    CD_PRODUTO: true,
                    NM_PRODUTO: true,
                    DS_SLUG: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado.');
    }

    return pedido;
  }

  async atualizaStatus(
    cd_pedido: number,
    dto: UpdatePedidoStatusDto,
  ): Promise<any> {
    const idPedido = Number(cd_pedido);

    if (isNaN(idPedido) || idPedido <= 0) {
      throw new BadRequestException(`ID do pedido inválido: ${cd_pedido}`);
    }

    const pedidoExistente = await this.prismaService.pEDIDOS.findUnique({
      where: { CD_PEDIDO: idPedido },
    });

    if (!pedidoExistente) {
      throw new NotFoundException('Pedido não encontrado.');
    }

    return this.prismaService.pEDIDOS.update({
      where: { CD_PEDIDO: idPedido },
      data: {
        TP_STATUS: dto.TP_STATUS,
        CD_RASTREIO: dto.CD_RASTREIO,
        TS_ATUALIZACAO: new Date(),
      },
    });
  }

  /**
   * Compra a etiqueta de envio no SuperFrete usando a reserva feita no
   * checkout (armazenada em CD_RASTREIO). Ação explícita — cobra da conta
   * SuperFrete de verdade, então só deve ser chamada quando o admin clicar
   * no botão, nunca automaticamente.
   */
  async comprarEtiqueta(cd_pedido: number): Promise<any> {
    const idPedido = Number(cd_pedido);

    const pedido = await this.prismaService.pEDIDOS.findUnique({
      where: { CD_PEDIDO: idPedido },
    });

    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado.');
    }

    if (!pedido.CD_RASTREIO) {
      throw new BadRequestException(
        'Esse pedido não tem um frete reservado no SuperFrete (o cliente pode não ter escolhido frete calculado no checkout).',
      );
    }

    const etiqueta = await this.superFreteService.comprarEtiqueta(
      pedido.CD_RASTREIO,
    );

    if (etiqueta.trackingCode) {
      await this.prismaService.pEDIDOS.update({
        where: { CD_PEDIDO: idPedido },
        data: {
          CD_RASTREIO: etiqueta.trackingCode,
          TS_ATUALIZACAO: new Date(),
        },
      });
    }

    return etiqueta;
  }
}
