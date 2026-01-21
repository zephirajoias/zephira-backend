import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/services/prisma.service';
import { supabaseAdmin } from '../../../common/supabase/supabase.provider';
import { CategoriaCreateDto } from '../dto/create-categoria.dto';
import { UpdateCategoriaDto } from '../dto/update-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(private readonly prismaService: PrismaService) {}

  private normalizeBigInt<T>(data: T): T {
    return JSON.parse(
      JSON.stringify(data, (_, value) =>
        typeof value === 'bigint' ? Number(value) : value,
      ),
    );
  }

  async categoriasPainel(): Promise<any[]> {
    const categorias = await this.prismaService.$queryRaw<
      Array<{
        TOTAL_CATEGORIAS: bigint;
        TOTAL_PRODUTOS: bigint;
        TOTAL_ATIVOS: bigint;
      }>
    >`SELECT 
	COUNT(C.*) TOTAL_CATEGORIAS,
	COUNT(PC.*) TOTAL_PRODUTOS,
	COUNT(C."SN_ATIVO") TOTAL_ATIVOS
FROM
	"Zephira"."CATEGORIA" C,
	"Zephira"."PRODUTOS_CATEGORIA" PC
WHERE
	PC."CD_CATEGORIA" = C."CD_CATEGORIA"
	AND C."SN_ATIVO" = 1`;

    return categorias.map((item) => ({
      TOTAL_CATEGORIAS: Number(item.TOTAL_CATEGORIAS),
      TOTAL_PRODUTOS: Number(item.TOTAL_PRODUTOS),
      TOTAL_ATIVOS: Number(item.TOTAL_ATIVOS),
    }));
  }

  async categoriaDetalhes(): Promise<any[]> {
    const categoriaDetalhes = await this.prismaService.$queryRaw<any[]>`
    SELECT 
      C."CD_CATEGORIA",
      C."NM_CATEGORIA",
      C."DS_SLUG",
      C."DS_URL_IMAGEM",
      (
        SELECT COUNT(*)
        FROM "Zephira"."PRODUTOS_CATEGORIA" PC
        WHERE PC."CD_CATEGORIA" = C."CD_CATEGORIA"
      ) QUANT_PRODUTO_CATEGORIA,
      C."SN_ATIVO",
      CASE 
        WHEN C."SN_ATIVO" = 1 THEN 'success' 
        ELSE 'secondary' 
      END AS ds_css_status
    FROM
      "Zephira"."CATEGORIA" C
  `;

    return this.normalizeBigInt(categoriaDetalhes);
  }

  async buscaTodasCategorias(): Promise<any[]> {
    const categoria = await this.prismaService.cATEGORIA.findMany({
      select: {
        CD_CATEGORIA: true,
        NM_CATEGORIA: true,
      },
    });

    return categoria;
  }

  async createCategoria(
    dto: CategoriaCreateDto,
    file: Express.Multer.File,
  ): Promise<number> {
    // 1. Definição do Caminho
    const fileExt = file.originalname.split('.').pop();
    const fileName = `categorias/${dto.DS_SLUG}-${Date.now()}.${fileExt}`;

    // 2. Upload (Server to Server)
    const { data, error } = await supabaseAdmin.storage
      .from('imagens-produtos')
      .upload(fileName, file.buffer, {
        // Usa o BUFFER do arquivo
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Erro Supabase:', error);
      throw new InternalServerErrorException('Falha no upload da imagem');
    }

    // 3. Gerar URL Pública
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('imagens-produtos').getPublicUrl(fileName);

    const categoria = await this.prismaService.cATEGORIA.create({
      data: {
        NM_CATEGORIA: dto.NM_CATEGORIA,
        DS_SLUG: dto.DS_SLUG,
        DS_URL_IMAGEM: publicUrl,
        SN_ATIVO: Number(dto.SN_ATIVO || 1),
        CD_CATEGORIA_PAI: dto.CD_CATEGORIA_PAI || null,
      },
      select: {
        CD_CATEGORIA: true,
      },
    });

    return categoria.CD_CATEGORIA;
  }

  async updateCategoria(
    dto: UpdateCategoriaDto,
    id_categoria: number,
  ): Promise<any> {
    const categoria = await this.prismaService.cATEGORIA.update({
      where: {
        CD_CATEGORIA: id_categoria,
      },
      data: {
        NM_CATEGORIA: dto.NM_CATEGORIA,
        DS_SLUG: dto.DS_SLUG,
      },
      select: {
        CD_CATEGORIA: true,
        NM_CATEGORIA: true,
      },
    });

    return categoria;
  }

  async deleteCategoria(id_categoria: number): Promise<any> {
    const categoria = await this.prismaService.cATEGORIA.delete({
      where: {
        CD_CATEGORIA: id_categoria,
      },
    });

    return categoria;
  }
}
