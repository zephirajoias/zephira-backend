import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import sharp from 'sharp';
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

  private async processImageBuffer(file: Express.Multer.File): Promise<Buffer> {
    let inputBuffer = file.buffer;

    const mimeType = file.mimetype?.toLowerCase() || '';
    const originalName = file.originalname?.toLowerCase() || '';
    const isHeic =
      mimeType === 'image/heic' ||
      mimeType === 'image/heif' ||
      originalName.endsWith('.heic');

    if (isHeic) {
      const heicConvert = require('heic-convert');
      // Transforma o HEIC em JPEG puro na memória
      inputBuffer = await heicConvert({
        buffer: file.buffer,
        format: 'JPEG',
        quality: 1, // Mantemos a qualidade em 100% aqui, o Sharp otimiza depois
      });
    }

    // Agora o Sharp recebe um buffer que ele sabe ler (JPEG nativo ou o JPEG convertido do HEIC)
    return await sharp(inputBuffer)
      .rotate() // Corrige orientação baseada no EXIF
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  async createProduto(
    dto: CreateProdutoDto,
    file: Express.Multer.File,
  ): Promise<any> {
    // 1️⃣ Validação básica
    if (!file) {
      throw new BadRequestException('Imagem do produto é obrigatória');
    }

    // 2️⃣ Processamento e Conversão da Imagem com Sharp
    let buffer: Buffer;
    try {
      buffer = await this.processImageBuffer(file);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      throw new BadRequestException('Falha ao processar arquivo de imagem');
    }

    const fileName = `produtos/${dto.DS_SLUG}-${Date.now()}.jpg`;

    // 3️⃣ Upload no Supabase
    const { error: uploadError } = await supabaseAdmin.storage
      .from('imagens-produtos')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
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
        CD_SKU: dto.CD_SKU,
        DS_TAMANHO: dto.DS_TAMANHO,
        QT_ESTOQUE: dto.QT_ESTOQUE,
      },
    });

    return variacao;
  }

  // async updateProduto(cd_produto: number, dto: any): Promise<any> {
  //   const precoFormatado = dto.VL_PRECO ? Number(dto.VL_PRECO) : undefined;
  //   const categoriaId = dto.CD_CATEGORIA ? Number(dto.CD_CATEGORIA) : undefined;

  //   return await this.prismaService.$transaction(async (tx) => {
  //     const produto = await tx.pRODUTOS.update({
  //       where: { CD_PRODUTO: Number(cd_produto) },
  //       data: {
  //         NM_PRODUTO: dto.NM_PRODUTO,
  //         DS_DESCRICAO: dto.DS_DESCRICAO,
  //         VL_PRECO: precoFormatado,
  //         TS_ATUALIZACAO: new Date(),
  //       },
  //     });

  //     if (categoriaId) {
  //       // Remove categorias antigas e adiciona a nova (assumindo 1 categoria por produto por enquanto baseado no schema)
  //       await tx.pRODUTOS_CATEGORIA.deleteMany({
  //         where: { CD_PRODUTO: Number(cd_produto) },
  //       });

  //       await tx.pRODUTOS_CATEGORIA.create({
  //         data: {
  //           CD_PRODUTO: Number(cd_produto),
  //           CD_CATEGORIA: categoriaId,
  //         },
  //       });
  //     }

  //     return produto;
  //   });
  // }

  async updateProduto(cd_produto: any, dto: any): Promise<any> {
    // 1️⃣ Fail-Fast: Sanitização e Validação do ID
    const idProduto = Number(cd_produto);

    if (isNaN(idProduto) || idProduto <= 0) {
      throw new BadRequestException(
        `ID do produto inválido recebido: ${cd_produto}`,
      );
    }

    const precoFormatado = dto.VL_PRECO ? Number(dto.VL_PRECO) : undefined;
    const categoriaId = dto.CD_CATEGORIA ? Number(dto.CD_CATEGORIA) : undefined;

    return await this.prismaService.$transaction(async (tx) => {
      const produto = await tx.pRODUTOS.update({
        where: { CD_PRODUTO: idProduto }, // Usa a variável limpa
        data: {
          NM_PRODUTO: dto.NM_PRODUTO,
          DS_DESCRICAO: dto.DS_DESCRICAO,
          VL_PRECO: precoFormatado,
          TS_ATUALIZACAO: new Date(),
        },
      });

      if (categoriaId) {
        await tx.pRODUTOS_CATEGORIA.deleteMany({
          where: { CD_PRODUTO: idProduto }, // Usa a variável limpa
        });

        await tx.pRODUTOS_CATEGORIA.create({
          data: {
            CD_PRODUTO: idProduto, // Usa a variável limpa
            CD_CATEGORIA: categoriaId,
          },
        });
      }

      return produto;
    });
  }

  async uploadImagensProduto(
    cd_produto: number,
    files: Express.Multer.File[],
    ds_slug: string,
  ): Promise<any> {
    const uploadedImages: any[] = [];

    for (const file of files) {
      // Processamento e Conversão da Imagem com Sharp
      let buffer: Buffer;
      try {
        buffer = await this.processImageBuffer(file);
      } catch (err) {
        console.error('Erro ao processar imagem:', err);
        continue; // Pula essa imagem se der erro
      }

      const fileName = `produtos/${ds_slug}-${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('imagens-produtos')
        .upload(fileName, buffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from('imagens-produtos').getPublicUrl(fileName);

      const imagem = await this.prismaService.iMAGENS_PRODUTO.create({
        data: {
          CD_PRODUTO: Number(cd_produto),
          DS_URL: publicUrl,
          SN_PRINCIPAL: '0',
          TS_CRIACAO: new Date(),
        },
      });

      uploadedImages.push(imagem);
    }

    return uploadedImages;
  }

  async deleteImagemProduto(cd_imagem: number): Promise<any> {
    const imagem = await this.prismaService.iMAGENS_PRODUTO.findUnique({
      where: { CD_IMAGEM: Number(cd_imagem) },
    });

    if (!imagem) {
      throw new BadRequestException('Imagem não encontrada');
    }

    // Extrair o nome do arquivo da URL para deletar no Supabase
    // Exemplo de URL: https://xyz.supabase.co/storage/v1/object/public/imagens-produtos/produtos/slug-123.jpg
    const urlParts = imagem.DS_URL.split('/');
    const fileName = `produtos/${urlParts[urlParts.length - 1]}`;

    await supabaseAdmin.storage.from('imagens-produtos').remove([fileName]);

    return await this.prismaService.iMAGENS_PRODUTO.delete({
      where: { CD_IMAGEM: Number(cd_imagem) },
    });
  }

  async setImagemPrincipal(
    cd_imagem: number,
    cd_produto: number,
  ): Promise<any> {
    return await this.prismaService.$transaction(async (tx) => {
      // Remove principal de todas as imagens do produto
      await tx.iMAGENS_PRODUTO.updateMany({
        where: { CD_PRODUTO: Number(cd_produto) },
        data: { SN_PRINCIPAL: '0' },
      });

      // Define a nova principal
      return await tx.iMAGENS_PRODUTO.update({
        where: { CD_IMAGEM: Number(cd_imagem) },
        data: { SN_PRINCIPAL: '1' },
      });
    });
  }
}
