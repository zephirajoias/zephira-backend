import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/services/prisma.service';
import { UpdatePaginaInstitucionalDto } from '../admin/dto/pagina-institucional.dto';

// As 6 páginas que o front (apps/e-commerce) espera existir, nessa ordem
// pra listagem no admin. Criar/apagar slug exigiria mexer no front também,
// então por enquanto é uma lista fixa, não uma tabela livre.
export const SLUGS_PAGINAS = [
  'sobre',
  'como-comprar',
  'trocas',
  'garantia',
  'faq',
  'contato',
] as const;

@Injectable()
export class PaginasService {
  constructor(private readonly prismaService: PrismaService) {}

  async listaTodas() {
    const paginas = await this.prismaService.pAGINA_INSTITUCIONAL.findMany();
    const porSlug = new Map(paginas.map((p) => [p.DS_SLUG, p]));
    // Sempre devolve as 6, na ordem certa, mesmo se alguma não tiver sido
    // semeada ainda (não deveria acontecer, mas evita a tela do admin
    // quebrar por causa disso).
    return SLUGS_PAGINAS.map(
      (slug) =>
        porSlug.get(slug) ?? {
          DS_SLUG: slug,
          NM_TITULO: slug,
          DS_CONTEUDO: '',
          TS_ATUALIZACAO: null,
        },
    );
  }

  async buscaPorSlug(slug: string) {
    if (!SLUGS_PAGINAS.includes(slug as any)) {
      throw new NotFoundException('Página não encontrada.');
    }
    const pagina = await this.prismaService.pAGINA_INSTITUCIONAL.findUnique({
      where: { DS_SLUG: slug },
    });
    if (!pagina) {
      throw new NotFoundException('Página não encontrada.');
    }
    return pagina;
  }

  async atualiza(slug: string, dto: UpdatePaginaInstitucionalDto) {
    if (!SLUGS_PAGINAS.includes(slug as any)) {
      throw new BadRequestException(`Página desconhecida: ${slug}`);
    }
    if (slug === 'faq') {
      try {
        const lista = JSON.parse(dto.DS_CONTEUDO);
        if (
          !Array.isArray(lista) ||
          lista.some((item) => typeof item?.p !== 'string' || typeof item?.r !== 'string')
        ) {
          throw new Error('formato inválido');
        }
      } catch {
        throw new BadRequestException(
          'O conteúdo do FAQ precisa ser a lista de perguntas e respostas (edite pela tela, não direto como texto).',
        );
      }
    }

    return this.prismaService.pAGINA_INSTITUCIONAL.upsert({
      where: { DS_SLUG: slug },
      create: {
        DS_SLUG: slug,
        NM_TITULO: dto.NM_TITULO,
        DS_CONTEUDO: dto.DS_CONTEUDO,
      },
      update: {
        NM_TITULO: dto.NM_TITULO,
        DS_CONTEUDO: dto.DS_CONTEUDO,
        TS_ATUALIZACAO: new Date(),
      },
    });
  }
}
