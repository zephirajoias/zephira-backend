import { interpretarPreco, interpretarTamanhos } from './interpretar';

describe('interpretarPreco', () => {
  it.each([
    ['89,90', 89.9],
    ['R$ 89,90', 89.9],
    ['r$89,9', 89.9],
    ['89.90', 89.9],
    ['90', 90],
    ['1.234,56', 1234.56],
    ['1.234', 1234],
    [' 42 ', 42],
  ])('%s -> %s', (texto, esperado) => {
    expect(interpretarPreco(texto)).toBe(esperado);
  });

  it.each(['', 'abc', '0', '-5', '89,90 reais', 'R$'])('recusa "%s"', (texto) => {
    expect(interpretarPreco(texto)).toBeNull();
  });
});

describe('interpretarTamanhos', () => {
  it('só um número vira tamanho único', () => {
    expect(interpretarTamanhos('5')).toEqual([{ DS_TAMANHO: 'U', QT_ESTOQUE: 5 }]);
  });

  it('lista separada por vírgula', () => {
    expect(interpretarTamanhos('P 2, M 3, g 1')).toEqual([
      { DS_TAMANHO: 'P', QT_ESTOQUE: 2 },
      { DS_TAMANHO: 'M', QT_ESTOQUE: 3 },
      { DS_TAMANHO: 'G', QT_ESTOQUE: 1 },
    ]);
  });

  it('um por linha, aro de anel e separadores variados', () => {
    expect(interpretarTamanhos('17 2\n18:1; 19=0')).toEqual([
      { DS_TAMANHO: '17', QT_ESTOQUE: 2 },
      { DS_TAMANHO: '18', QT_ESTOQUE: 1 },
      { DS_TAMANHO: '19', QT_ESTOQUE: 0 },
    ]);
  });

  it('tamanho com espaço', () => {
    expect(interpretarTamanhos('40 cm 3, 45 cm 2')).toEqual([
      { DS_TAMANHO: '40 CM', QT_ESTOQUE: 3 },
      { DS_TAMANHO: '45 CM', QT_ESTOQUE: 2 },
    ]);
  });

  it('tamanho terminado em X não perde a letra', () => {
    expect(interpretarTamanhos('GX 2, XG 1')).toEqual([
      { DS_TAMANHO: 'GX', QT_ESTOQUE: 2 },
      { DS_TAMANHO: 'XG', QT_ESTOQUE: 1 },
    ]);
  });

  it.each(['', 'P, M', 'P 2, P 3', 'muitos'])('recusa "%s"', (texto) => {
    expect(interpretarTamanhos(texto)).toBeNull();
  });
});
