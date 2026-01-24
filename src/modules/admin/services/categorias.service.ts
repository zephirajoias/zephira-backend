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
      -- Buscamos o nome do pai usando um alias (P)
      P."NM_CATEGORIA" AS "NM_CATEGORIA_PAI", 
      C."DS_SLUG",
      C."DS_URL_IMAGEM",
      (
        SELECT COUNT(*)
        FROM "Zephira"."PRODUTOS_CATEGORIA" PC
        WHERE PC."CD_CATEGORIA" = C."CD_CATEGORIA"
      ) AS "QT_PRODUTOS", -- Alinhado com sua interface frontend
      C."SN_ATIVO",
      CASE 
        WHEN C."SN_ATIVO" = 1 THEN 'success' 
        ELSE 'secondary' 
      END AS ds_css_status
    FROM
      "Zephira"."CATEGORIA" C
    LEFT JOIN "Zephira"."CATEGORIA" P ON C."CD_CATEGORIA_PAI" = P."CD_CATEGORIA"
    ORDER BY C."NM_CATEGORIA" ASC
  `;

    return this.normalizeBigInt(categoriaDetalhes);
  }

  async buscaTodasCategorias(): Promise<any[]> {
    const categorias = await this.prismaService.cATEGORIA.findMany({
      select: {
        CD_CATEGORIA: true,
        NM_CATEGORIA: true,
        CD_CATEGORIA_PAI: true,
        CATEGORIA: {
          select: {
            NM_CATEGORIA: true,
          },
        },
      },
    });

    return categorias.map((cat) => ({
      CD_CATEGORIA: cat.CD_CATEGORIA,
      // Aqui acessamos cat.CATEGORIA (que é o objeto pai)
      NM_CATEGORIA_DISPLAY: cat.CATEGORIA?.NM_CATEGORIA
        ? `${cat.CATEGORIA.NM_CATEGORIA} > ${cat.NM_CATEGORIA}`
        : cat.NM_CATEGORIA,
    }));
  }

  async createCategoria(
    dto: CategoriaCreateDto,
    file?: Express.Multer.File, // 1. Torna o arquivo opcional
  ): Promise<number> {
    let publicUrl: string | null = null; // Inicializa como null

    // 2. Só processa o upload se o arquivo existir
    if (file) {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `categorias/${dto.DS_SLUG}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabaseAdmin.storage
        .from('imagens-produtos')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error('Erro Supabase:', error);
        throw new InternalServerErrorException('Falha no upload da imagem');
      }

      // Busca a URL pública após o upload bem-sucedido
      const { data: urlData } = supabaseAdmin.storage
        .from('imagens-produtos')
        .getPublicUrl(fileName);

      publicUrl = urlData.publicUrl;
    }

    // 3. Persistência no banco de dados
    try {
      const categoria = await this.prismaService.cATEGORIA.create({
        data: {
          NM_CATEGORIA: dto.NM_CATEGORIA,
          DS_SLUG: dto.DS_SLUG,
          DS_URL_IMAGEM: publicUrl, // Será null se não houver arquivo
          SN_ATIVO: Number(dto.SN_ATIVO ?? 1),
          CD_CATEGORIA_PAI: Number(dto.CD_CATEGORIA_PAI) || null,
        },
        select: {
          CD_CATEGORIA: true,
        },
      });

      return categoria.CD_CATEGORIA;
    } catch (dbError) {
      // Opcional: Lógica para deletar o arquivo no Supabase caso o Prisma falhe (Rollback manual)
      console.error('Erro ao salvar categoria:', dbError);
      throw new InternalServerErrorException(
        'Erro ao salvar categoria no banco de dados',
      );
    }
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
