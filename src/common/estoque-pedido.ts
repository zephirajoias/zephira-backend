import { Prisma, STATUS_PEDIDO } from '@prisma/client';

// O estoque sai na criação do pedido (PENDENTE) e só volta quando o pedido é
// CANCELADO. DEVOLVIDO (reembolso) não devolve sozinho: a peça só volta pro
// estoque quando a loja recebe de volta, e isso é ajuste manual no admin.
const foraDoEstoque = (status: STATUS_PEDIDO | null) => status !== 'CANCELADO';

/**
 * Acerta o estoque quando o pedido troca de status. Chamar dentro da mesma
 * transação que grava o status novo.
 *
 * - Entrou em CANCELADO: devolve as peças.
 * - Saiu de CANCELADO (o cliente pagou numa segunda tentativa no Mercado
 *   Pago, ou o admin reabriu o pedido): tira as peças de novo, mesmo que o
 *   estoque fique negativo, porque o pedido já existe e precisa aparecer.
 */
export async function acertarEstoqueDoPedido(
  tx: Prisma.TransactionClient,
  cdPedido: number,
  statusAnterior: STATUS_PEDIDO | null,
  statusNovo: STATUS_PEDIDO,
): Promise<void> {
  if (foraDoEstoque(statusAnterior) === foraDoEstoque(statusNovo)) return;

  const devolver = !foraDoEstoque(statusNovo);
  const itens = await tx.iTENS_PEDIDO.findMany({
    where: { CD_PEDIDO: cdPedido, CD_VARIACAO: { not: null } },
    select: { CD_VARIACAO: true, QT_ITEM: true },
  });

  for (const item of itens) {
    // updateMany não quebra se a variação tiver sido apagada depois do pedido.
    await tx.vARIACOES_PRODUTO.updateMany({
      where: { CD_VARIACAO: item.CD_VARIACAO! },
      data: {
        QT_ESTOQUE: devolver
          ? { increment: item.QT_ITEM }
          : { decrement: item.QT_ITEM },
      },
    });
  }
}
