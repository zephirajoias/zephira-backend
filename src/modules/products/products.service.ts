import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/services/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listaProdutos(
    page = 1,
    limit = 20,
    categoriaSlug?: string,
    busca?: string,
  ): Promise<any> {
    const skip = (page - 1) * limit;

    const where: any = {
      SN_ATIVO: 'S',
    };

    if (categoriaSlug) {
      where.PRODUTOS_CATEGORIA = {
        some: { CATEGORIA: { DS_SLUG: categoriaSlug } },
      };
    }

    if (busca) {
      where.NM_PRODUTO = { contains: busca, mode: 'insensitive' };
    }

    const [produtos, total] = await this.prismaService.$transaction([
      this.prismaService.pRODUTOS.findMany({
        where,
        skip,
        take: limit,
        orderBy: { TS_CRIACAO: 'desc' },
        select: {
          CD_PRODUTO: true,
          NM_PRODUTO: true,
          DS_SLUG: true,
          VL_PRECO: true,
          VL_PRECO_PROMOCIONAL: true,
          IMAGENS_PRODUTO: {
            where: { SN_PRINCIPAL: '1' },
            take: 1,
            select: { DS_URL: true },
          },
          PRODUTOS_CATEGORIA: {
            select: {
              CATEGORIA: { select: { CD_CATEGORIA: true, NM_CATEGORIA: true } },
            },
          },
        },
      }),
      this.prismaService.pRODUTOS.count({ where }),
    ]);

    return {
      data: produtos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async buscaProdutoPorSlug(slug: string): Promise<any> {
    const produto = await this.prismaService.pRODUTOS.findFirst({
      where: { DS_SLUG: slug, SN_ATIVO: 'S' },
      include: {
        IMAGENS_PRODUTO: {
          orderBy: [{ SN_PRINCIPAL: 'desc' }, { NR_ORDEM: 'asc' }],
        },
        VARIACOES_PRODUTO: {
          select: {
            CD_VARIACAO: true,
            CD_SKU: true,
            DS_TAMANHO: true,
            QT_ESTOQUE: true,
          },
        },
        PRODUTOS_CATEGORIA: {
          select: {
            CATEGORIA: {
              select: { CD_CATEGORIA: true, NM_CATEGORIA: true, DS_SLUG: true },
            },
          },
        },
        PRODUTOS_TAGS: {
          select: {
            TAGS: { select: { CD_TAG: true, NM_TAG: true, DS_SLUG: true } },
          },
        },
      },
    });

    if (!produto) {
      throw new NotFoundException('Produto não encontrado.');
    }

    return produto;
  }

  async listaCategorias(): Promise<any[]> {
    return this.prismaService.cATEGORIA.findMany({
      where: { SN_ATIVO: 1, CD_CATEGORIA_PAI: null },
      select: {
        CD_CATEGORIA: true,
        NM_CATEGORIA: true,
        DS_SLUG: true,
        DS_URL_IMAGEM: true,
        other_CATEGORIA: {
          where: { SN_ATIVO: 1 },
          select: {
            CD_CATEGORIA: true,
            NM_CATEGORIA: true,
            DS_SLUG: true,
            DS_URL_IMAGEM: true,
          },
        },
      },
      orderBy: { NM_CATEGORIA: 'asc' },
    });
  }

  async buscaCategoriaPorSlug(
    slug: string,
    page = 1,
    limit = 20,
  ): Promise<any> {
    const categoria = await this.prismaService.cATEGORIA.findFirst({
      where: { DS_SLUG: slug, SN_ATIVO: 1 },
    });

    if (!categoria) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    const produtos = await this.listaProdutos(page, limit, slug);

    return {
      categoria,
      ...produtos,
    };
  }
}
