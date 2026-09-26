import { PrismaService } from 'src/prisma/services/prisma.service';

// "Colar Aço + Frase" -> "colar-aco-frase". Tira o acento antes de limpar;
// o jeito antigo (no navegador) apagava a letra acentuada inteira e gerava
// "colar-ao--frase".
export function gerarSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

// Endereço de produto é único: se já existir, acrescenta -2, -3...
// Duas peças com o mesmo endereço abriam a mesma página (a do tamanho P
// aparecia no link do tamanho G).
export async function gerarSlugUnicoProduto(
  prisma: PrismaService,
  nome: string,
): Promise<string> {
  const base = gerarSlug(nome) || 'produto';
  const existentes = await prisma.pRODUTOS.findMany({
    where: { DS_SLUG: { startsWith: base } },
    select: { DS_SLUG: true },
  });
  const usados = new Set(existentes.map((p) => p.DS_SLUG));
  let slug = base;
  for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}
