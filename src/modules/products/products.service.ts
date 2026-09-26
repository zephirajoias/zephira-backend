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
      // Cada palavra precisa aparecer (em qualquer ordem) no nome, no slug
      // ou na categoria da peça. Slug não tem acento ("aco" acha "Aço"), e o
      // material fica na subcategoria (Prata, Ouro, Aço), não no nome.
      const palavras = busca.trim().split(/\s+/).filter(Boolean).slice(0, 6);
      where.AND = palavras.map((palavra) => {
        const semAcento = palavra
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toLowerCase();
        return {
          OR: [
            { NM_PRODUTO: { contains: palavra, mode: 'insensitive' } },
            { DS_SLUG: { contains: semAcento } },
            {
              PRODUTOS_CATEGORIA: {
                some: {
                  CATEGORIA: {
                    OR: [
                      { DS_SLUG: { contains: semAcento } },
                      { NM_CATEGORIA: { contains: palavra, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            },
          ],
        };
      });
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
            // Capa ('S') primeiro; se nenhuma foto estiver marcada como capa,
            // cai na primeira pela ordem. Filtrar só 'S' deixava sem foto
            // produtos que têm imagem mas nenhuma marcada (o default da
            // coluna no banco é '0').
            orderBy: [{ SN_PRINCIPAL: 'desc' }, { NR_ORDEM: 'asc' }],
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

  // DS_SLUG não é único (ex: "aco" existe embaixo de Brinco, Colar,
  // Pulseira etc), então a busca é hierárquica: primeiro acha a categoria
  // de topo pelo slug, depois (se veio subcategoria) acha a filha dela
  // especificamente — em vez de casar qualquer categoria com esse slug
  // solto, o que misturaria produtos de categorias diferentes.
  async buscaCategoriaPorSlug(
    slug: string,
    subSlug?: string,
    page = 1,
    limit = 20,
  ): Promise<any> {
    const categoriaPai = await this.prismaService.cATEGORIA.findFirst({
      where: { DS_SLUG: slug, CD_CATEGORIA_PAI: null, SN_ATIVO: 1 },
    });

    if (!categoriaPai) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    let categoriaAlvo = categoriaPai;
    let categoriaIds: number[];

    if (subSlug) {
      const filha = await this.prismaService.cATEGORIA.findFirst({
        where: {
          DS_SLUG: subSlug,
          CD_CATEGORIA_PAI: categoriaPai.CD_CATEGORIA,
          SN_ATIVO: 1,
        },
      });

      if (!filha) {
        throw new NotFoundException('Subcategoria não encontrada.');
      }

      categoriaAlvo = filha;
      categoriaIds = [filha.CD_CATEGORIA];
    } else {
      // Sem subcategoria: mostra produtos de todas as filhas (é onde os
      // produtos realmente ficam tageados) mais o próprio pai, se algum
      // produto estiver tageado direto nele.
      const filhas = await this.prismaService.cATEGORIA.findMany({
        where: { CD_CATEGORIA_PAI: categoriaPai.CD_CATEGORIA, SN_ATIVO: 1 },
        select: { CD_CATEGORIA: true },
      });
      categoriaIds = [
        categoriaPai.CD_CATEGORIA,
        ...filhas.map((f) => f.CD_CATEGORIA),
      ];
    }

    const skip = (page - 1) * limit;
    const where = {
      SN_ATIVO: 'S',
      PRODUTOS_CATEGORIA: { some: { CD_CATEGORIA: { in: categoriaIds } } },
    };

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
            orderBy: [{ SN_PRINCIPAL: 'desc' }, { NR_ORDEM: 'asc' }],
            take: 1,
            select: { DS_URL: true },
          },
        },
      }),
      this.prismaService.pRODUTOS.count({ where }),
    ]);

    return {
      categoria: categoriaAlvo,
      data: produtos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
