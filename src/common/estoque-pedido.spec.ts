import { acertarEstoqueDoPedido } from './estoque-pedido';

function txFalso() {
  const updateMany = jest.fn().mockResolvedValue({ count: 1 });
  const tx = {
    iTENS_PEDIDO: {
      findMany: jest.fn().mockResolvedValue([
        { CD_VARIACAO: 10, QT_ITEM: 2 },
        { CD_VARIACAO: 11, QT_ITEM: 1 },
      ]),
    },
    vARIACOES_PRODUTO: { updateMany },
  };
  return { tx: tx as any, updateMany };
}

describe('acertarEstoqueDoPedido', () => {
  it('devolve as peças quando o pedido é cancelado', async () => {
    const { tx, updateMany } = txFalso();
    await acertarEstoqueDoPedido(tx, 1, 'PENDENTE', 'CANCELADO');
    expect(updateMany).toHaveBeenCalledWith({
      where: { CD_VARIACAO: 10 },
      data: { QT_ESTOQUE: { increment: 2 } },
    });
    expect(updateMany).toHaveBeenCalledTimes(2);
  });

  it('tira de novo quando um pedido cancelado é pago', async () => {
    const { tx, updateMany } = txFalso();
    await acertarEstoqueDoPedido(tx, 1, 'CANCELADO', 'PAGO');
    expect(updateMany).toHaveBeenCalledWith({
      where: { CD_VARIACAO: 11 },
      data: { QT_ESTOQUE: { decrement: 1 } },
    });
  });

  it('não mexe no estoque entre status que já estão fora dele', async () => {
    const { tx, updateMany } = txFalso();
    await acertarEstoqueDoPedido(tx, 1, 'PENDENTE', 'PAGO');
    await acertarEstoqueDoPedido(tx, 1, 'PAGO', 'DEVOLVIDO');
    await acertarEstoqueDoPedido(tx, 1, null, 'ENVIADO');
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('não devolve duas vezes num cancelado repetido', async () => {
    const { tx, updateMany } = txFalso();
    await acertarEstoqueDoPedido(tx, 1, 'CANCELADO', 'CANCELADO');
    expect(updateMany).not.toHaveBeenCalled();
  });
});
