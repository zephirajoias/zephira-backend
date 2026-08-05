import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/services/prisma.service';
import { CheckoutDto } from '../dto/checkout.dto';
import { PagamentoService } from './pagamento.service';
import { SuperFreteService } from './superfrete.service';

@Injectable()
export class PedidosService {
  private readonly logger = new Logger(PedidosService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly pagamentoService: PagamentoService,
    private readonly superFreteService: SuperFreteService,
  ) {}

  async checkout(cd_usuario: number, dto: CheckoutDto): Promise<any> {
    const [endereco, usuario] = await Promise.all([
      this.prismaService.eNDERECO.findUnique({
        where: { CD_ENDERECO: dto.CD_ENDERECO },
      }),
      this.prismaService.uSUARIO.findUnique({
        where: { CD_USUARIO: cd_usuario },
      }),
    ]);

    if (!endereco || endereco.CD_USUARIO !== cd_usuario) {
      throw new ForbiddenException(
        'Endereço inválido ou não pertence a você.',
      );
    }

    const cdVariacoes = dto.itens.map((item) => item.CD_VARIACAO);

    const variacoes = await this.prismaService.vARIACOES_PRODUTO.findMany({
      where: { CD_VARIACAO: { in: cdVariacoes } },
      include: { PRODUTOS: true },
    });

    if (variacoes.length !== cdVariacoes.length) {
      throw new BadRequestException(
        'Uma ou mais variações de produto não existem.',
      );
    }

    const variacoesPorId = new Map(
      variacoes.map((v) => [v.CD_VARIACAO, v]),
    );

    let subtotal = 0;
    const itensParaCriar = dto.itens.map((item) => {
      const variacao = variacoesPorId.get(item.CD_VARIACAO)!;

      if (variacao.QT_ESTOQUE < item.QT_ITEM) {
        throw new BadRequestException(
          `Estoque insuficiente para o SKU ${variacao.CD_SKU}.`,
        );
      }

      const precoUnitario = Number(
        variacao.PRODUTOS.VL_PRECO_PROMOCIONAL ?? variacao.PRODUTOS.VL_PRECO,
      );
      const totalItem = precoUnitario * item.QT_ITEM;
      subtotal += totalItem;

      return {
        CD_VARIACAO: variacao.CD_VARIACAO,
        NM_PRODUTO_SNAPSHOT: variacao.PRODUTOS.NM_PRODUTO,
        CD_SKU_SNAPSHOT: variacao.CD_SKU,
        QT_ITEM: item.QT_ITEM,
        VL_UNITARIO: precoUnitario,
        VL_TOTAL_ITEM: totalItem,
      };
    });

    let desconto = 0;
    let promocao: { CD_PROMOCAO: number } | null = null;
    let frete = dto.VL_FRETE ?? 0;

    if (dto.CD_SERVICO_FRETE) {
      const opcoesFrete = await this.superFreteService.calcularFrete(
        endereco.NR_CEP,
      );
      const opcaoEscolhida = opcoesFrete.find(
        (o) => o.idServico === dto.CD_SERVICO_FRETE,
      );

      if (!opcaoEscolhida) {
        throw new BadRequestException(
          'Opção de frete inválida ou expirada, recalcule o frete.',
        );
      }

      frete = opcaoEscolhida.preco;
    }

    if (dto.DS_CODIGO_PROMOCIONAL) {
      const promo = await this.prismaService.pROMOCOES.findUnique({
        where: { DS_CODIGO: dto.DS_CODIGO_PROMOCIONAL },
      });

      if (!promo || promo.SN_ATIVO !== 1) {
        throw new BadRequestException('Código promocional inválido.');
      }

      const agora = new Date();
      if (promo.DT_INICIO > agora || (promo.DT_FIM && promo.DT_FIM < agora)) {
        throw new BadRequestException('Código promocional expirado.');
      }

      if (
        promo.QT_LIMITE_USO !== null &&
        (promo.QT_USOS_ATUAL ?? 0) >= promo.QT_LIMITE_USO
      ) {
        throw new BadRequestException(
          'Código promocional atingiu o limite de uso.',
        );
      }

      if (
        promo.VL_PEDIDO_MINIMO &&
        subtotal < Number(promo.VL_PEDIDO_MINIMO)
      ) {
        throw new BadRequestException(
          `Pedido mínimo para esse cupom: ${promo.VL_PEDIDO_MINIMO}.`,
        );
      }

      switch (promo.TP_PROMOCAO) {
        case 'PERCENTUAL':
          desconto = subtotal * (Number(promo.VL_DESCONTO ?? 0) / 100);
          break;
        case 'VALOR_FIXO':
          desconto = Number(promo.VL_DESCONTO ?? 0);
          break;
        case 'FRETE_GRATIS':
          frete = 0;
          break;
        default:
          throw new BadRequestException(
            'Este tipo de cupom ainda não é suportado no checkout.',
          );
      }

      desconto = Math.min(desconto, subtotal);
      promocao = { CD_PROMOCAO: promo.CD_PROMOCAO };
    }

    const total = subtotal - desconto + frete;

    const pedido = await this.prismaService.$transaction(async (tx: any) => {
      for (const item of dto.itens) {
        const resultado = await tx.vARIACOES_PRODUTO.updateMany({
          where: {
            CD_VARIACAO: item.CD_VARIACAO,
            QT_ESTOQUE: { gte: item.QT_ITEM },
          },
          data: { QT_ESTOQUE: { decrement: item.QT_ITEM } },
        });

        if (resultado.count === 0) {
          throw new BadRequestException(
            `Estoque insuficiente para a variação ${item.CD_VARIACAO}.`,
          );
        }
      }

      const pedidoCriado = await tx.pEDIDOS.create({
        data: {
          CD_USUARIO: cd_usuario,
          VL_SUBTOTAL: subtotal,
          VL_DESCONTO: desconto,
          VL_FRETE: frete,
          VL_TOTAL: total,
          TP_STATUS: 'PENDENTE',
          TP_METODO_PAGAMENTO: dto.TP_METODO_PAGAMENTO,
          DS_SNAPSHOT_ENDERECO: {
            NR_CEP: endereco.NR_CEP,
            NM_LOGRADOURO: endereco.NM_LOGRADOURO,
            NR_NUMERO: endereco.NR_NUMERO,
            DS_COMPLEMENTO: endereco.DS_COMPLEMENTO,
            NM_BAIRRO: endereco.NM_BAIRRO,
            NM_CIDADE: endereco.NM_CIDADE,
            DS_UF: endereco.DS_UF,
          },
          TS_CRIACAO: new Date(),
          TS_ATUALIZACAO: new Date(),
          ITENS_PEDIDO: {
            createMany: { data: itensParaCriar },
          },
        },
        include: { ITENS_PEDIDO: true },
      });

      if (promocao) {
        await tx.pROMOCOES.update({
          where: { CD_PROMOCAO: promocao.CD_PROMOCAO },
          data: { QT_USOS_ATUAL: { increment: 1 } },
        });
      }

      return pedidoCriado;
    });

    let checkoutUrl: string | null = null;
    try {
      const preferencia = await this.pagamentoService.criarPreferencia(pedido);
      checkoutUrl = preferencia?.checkoutUrl ?? null;
    } catch (err) {
      this.logger.error(
        `Falha ao criar preferência de pagamento para o pedido #${pedido.CD_PEDIDO}`,
        err as Error,
      );
    }

    if (dto.CD_SERVICO_FRETE && usuario) {
      try {
        const envio = await this.superFreteService.reservarEnvio(
          dto.CD_SERVICO_FRETE,
          {
            nome: usuario.NM_USUARIO,
            cep: endereco.NR_CEP,
            endereco: endereco.NM_LOGRADOURO,
            numero: endereco.NR_NUMERO,
            bairro: endereco.NM_BAIRRO,
            cidade: endereco.NM_CIDADE,
            uf: endereco.DS_UF,
            documento: endereco.DS_DOCUMENTO,
          },
          pedido.ITENS_PEDIDO.map((item: any) => ({
            nome: item.NM_PRODUTO_SNAPSHOT,
            quantidade: item.QT_ITEM,
            valorUnitario: Number(item.VL_UNITARIO),
          })),
          Number(pedido.VL_TOTAL),
        );

        if (envio) {
          await this.prismaService.pEDIDOS.update({
            where: { CD_PEDIDO: pedido.CD_PEDIDO },
            data: { CD_RASTREIO: envio.cartId },
          });
        }
      } catch (err) {
        this.logger.error(
          `Falha ao reservar envio no SuperFrete para o pedido #${pedido.CD_PEDIDO}`,
          err as Error,
        );
      }
    }

    return { ...pedido, checkoutUrl };
  }

  async meusPedidos(
    cd_usuario: number,
    page = 1,
    limit = 20,
  ): Promise<any> {
    const skip = (page - 1) * limit;

    const [pedidos, total] = await this.prismaService.$transaction([
      this.prismaService.pEDIDOS.findMany({
        where: { CD_USUARIO: cd_usuario },
        skip,
        take: limit,
        orderBy: { TS_CRIACAO: 'desc' },
        include: { ITENS_PEDIDO: true },
      }),
      this.prismaService.pEDIDOS.count({ where: { CD_USUARIO: cd_usuario } }),
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

  async meuPedidoDetalhes(cd_usuario: number, cd_pedido: number): Promise<any> {
    const pedido = await this.prismaService.pEDIDOS.findUnique({
      where: { CD_PEDIDO: cd_pedido },
      include: {
        ITENS_PEDIDO: {
          include: {
            VARIACOES_PRODUTO: {
              select: {
                CD_VARIACAO: true,
                DS_TAMANHO: true,
                CD_SKU: true,
                PRODUTOS: {
                  select: { DS_SLUG: true, NM_PRODUTO: true },
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

    if (pedido.CD_USUARIO !== cd_usuario) {
      throw new ForbiddenException('Esse pedido não pertence a você.');
    }

    return pedido;
  }
}
