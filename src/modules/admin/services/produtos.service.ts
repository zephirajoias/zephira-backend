import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { supabaseAdmin } from 'src/common/supabase/supabase.provider';
import { PrismaService } from 'src/prisma/services/prisma.service';
import { CreateProdutoDto, CreateVariacaoDto } from '../dto/create-produto.dto';
import { UpdateVariacaoDto } from '../dto/update-produto.dto';

@Injectable()
export class ProdutosService {
  constructor(private readonly prismaService: PrismaService) {}

  private normalizeBigInt<T>(data: T): T {
    return JSON.parse(
      JSON.stringify(data, (_, value) =>
        typeof value === 'bigint' ? Number(value) : value,
      ),
    );
  }

  async createProduto(
    dto: CreateProdutoDto,
    file: Express.Multer.File,
  ): Promise<any> {
    // 1️⃣ Validação básica
    if (!file) {
      throw new BadRequestException('Imagem do produto é obrigatória');
    }

    // 2️⃣ Definição do caminho do arquivo
    const fileExt = file.originalname.split('.').pop();
    const fileName = `produtos/${dto.DS_SLUG}-${Date.now()}.${fileExt}`;

    // 3️⃣ Upload no Supabase
    const { error: uploadError } = await supabaseAdmin.storage
      .from('imagens-produtos')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error(uploadError);
      throw new InternalServerErrorException('Falha no upload da imagem');
    }

    // 4️⃣ URL pública
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('imagens-produtos').getPublicUrl(fileName);

    // 5️⃣ Parse das variações
    let variacoesProcessadas: any[] = [];
    try {
      variacoesProcessadas =
        typeof dto.variacoes === 'string'
          ? JSON.parse(dto.variacoes)
          : dto.variacoes;
    } catch {
      await supabaseAdmin.storage.from('imagens-produtos').remove([fileName]);
      throw new BadRequestException('Formato inválido das variações');
    }

    // 6️⃣ Conversões
    const precoFormatado = Number(dto.VL_PRECO);
    const categoriaId = Number(dto.CD_CATEGORIA);

    // 7️⃣ TRANSAÇÃO (produto + variações)
    try {
      const produto = await this.prismaService.$transaction(async (tx) => {
        // 7.1️⃣ Cria o produto
        const produtoCriado = await tx.pRODUTOS.create({
          data: {
            NM_PRODUTO: dto.NM_PRODUTO,
            DS_SLUG: dto.DS_SLUG,
            DS_DESCRICAO: dto.DS_DESCRICAO,
            VL_PRECO: precoFormatado,
            SN_ATIVO: 'S',
            TS_CRIACAO: new Date(),

            PRODUTOS_CATEGORIA: {
              create: {
                CD_CATEGORIA: categoriaId,
              },
            },

            IMAGENS_PRODUTO: {
              create: {
                DS_URL: publicUrl,
                SN_PRINCIPAL: dto.SN_PRINCIPAL,
                TS_CRIACAO: new Date(),
              },
            },
          },
          select: {
            CD_PRODUTO: true,
          },
        });

        const produtoId = produtoCriado.CD_PRODUTO;

        // 7.2️⃣ Cria variações com SKU gerado
        if (variacoesProcessadas.length > 0) {
          await tx.vARIACOES_PRODUTO.createMany({
            data: variacoesProcessadas.map((v: any) => {
              const sku = `${dto.DS_SLUG.toUpperCase()}-${produtoId}-${v.DS_TAMANHO}`;

              return {
                CD_PRODUTO: produtoId,
                CD_SKU: sku,
                DS_TAMANHO: v.DS_TAMANHO,
                QT_ESTOQUE: Number(v.QT_ESTOQUE),
                TS_CRIACAO: new Date(),
              };
            }),
          });
        }

        return produtoCriado;
      });

      return produto;
    } catch (error) {
      // 8️⃣ Rollback do Supabase se falhar
      await supabaseAdmin.storage.from('imagens-produtos').remove([fileName]);
      throw error;
    }
  }

  async deletaVariacao(cd_variacao: number): Promise<any> {
    const variacoes = await this.prismaService.vARIACOES_PRODUTO.delete({
      where: {
        CD_VARIACAO: Number(cd_variacao),
      },
    });

    return variacoes;
  }

  async deletaProduto(cd_produto: number): Promise<any> {
    const produto = await this.prismaService.pRODUTOS.delete({
      where: {
        CD_PRODUTO: Number(cd_produto),
      },
    });

    return produto;
  }

  async listaProdutos(): Promise<any[]> {
    const produtos = await this.prismaService.pRODUTOS.findMany({
      select: {
        CD_PRODUTO: true,
        NM_PRODUTO: true,
        IMAGENS_PRODUTO: {
          select: {
            DS_URL: true,
          },
        },
      },
    });

    return produtos;
  }

  async createVariacao(
    dto: CreateVariacaoDto,
    produtoId: number,
  ): Promise<any> {
    const sku = `${dto.DS_SLUG.toUpperCase()}-${produtoId}-${dto.DS_TAMANHO}`;
    const variacao = await this.prismaService.vARIACOES_PRODUTO.create({
      data: {
        CD_PRODUTO: Number(produtoId),
        CD_SKU: sku,
        DS_TAMANHO: dto.DS_TAMANHO,
        QT_ESTOQUE: dto.QT_ESTOQUE,
      },
    });

    return variacao;
  }

  async editaVariacao(dto: UpdateVariacaoDto): Promise<any> {
    const variacao = await this.prismaService.vARIACOES_PRODUTO.update({
      where: {
        CD_VARIACAO: Number(dto.CD_VARIACAO),
      },
      data: {
        DS_TAMANHO: dto.DS_TAMANHO,
        QT_ESTOQUE: dto.QT_ESTOQUE,
      },
    });

    return variacao;
  }
}
