// Interpreta o que a pessoa digita no bot. Aceita o jeito brasileiro de
// escrever, com vírgula, "R$" e espaços, porque é assim que se digita no
// celular.

/** "89,90", "R$ 89,90", "89.90", "1.234,56", "90" -> número; null se não der. */
export function interpretarPreco(texto: string): number | null {
  let t = texto.replace(/r\$|\s/gi, '');
  if (!/^\d[\d.,]*$/.test(t)) return null;
  if (t.includes(',')) {
    // Vírgula é o decimal; pontos antes dela são milhar.
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    // "1.234" sem vírgula: ponto de milhar.
    t = t.replace(/\./g, '');
  }
  const valor = Number(t);
  if (!Number.isFinite(valor) || valor <= 0 || valor > 1_000_000) return null;
  return Math.round(valor * 100) / 100;
}

export interface TamanhoEstoque {
  DS_TAMANHO: string;
  QT_ESTOQUE: number;
}

/**
 * "5"                -> tamanho único (U) com 5
 * "P 2, M 3, G 1"    -> três tamanhos
 * "17 2\n18 1"       -> um por linha (aro de anel)
 * "P:2; M=3"         -> separadores variados
 * Devolve null se alguma parte não fizer sentido, pra o bot pedir de novo.
 */
export function interpretarTamanhos(texto: string): TamanhoEstoque[] | null {
  const limpo = texto.trim();
  if (/^\d+$/.test(limpo)) {
    const qt = Number(limpo);
    return qt <= 100_000 ? [{ DS_TAMANHO: 'U', QT_ESTOQUE: qt }] : null;
  }

  const partes = limpo.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
  if (partes.length === 0) return null;

  const vistos = new Set<string>();
  const resultado: TamanhoEstoque[] = [];
  for (const parte of partes) {
    // Sem "x" como separador: "GX 2" viraria tamanho "G".
    const m = parte.match(/^(.+?)\s*[:=-]?\s*(\d+)$/);
    if (!m) return null;
    const tamanho = m[1].trim().toUpperCase();
    const qt = Number(m[2]);
    if (!tamanho || tamanho.length > 20 || qt > 100_000) return null;
    if (vistos.has(tamanho)) return null;
    vistos.add(tamanho);
    resultado.push({ DS_TAMANHO: tamanho, QT_ESTOQUE: qt });
  }
  return resultado;
}

export const formatarReal = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
