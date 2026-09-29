import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateProdutoDto } from './update-produto.dto';

const validar = (corpo: object) => {
  const dto = plainToInstance(UpdateProdutoDto, corpo);
  return { dto, erros: validateSync(dto, { whitelist: true }) };
};

describe('UpdateProdutoDto', () => {
  it('aceita preço promocional numérico', () => {
    const { dto, erros } = validar({ VL_PRECO: 59.99, VL_PRECO_PROMOCIONAL: '49.99' });
    expect(erros).toHaveLength(0);
    expect(dto.VL_PRECO_PROMOCIONAL).toBe(49.99);
  });

  it('null tira a promoção sem erro de validação', () => {
    const { dto, erros } = validar({ VL_PRECO_PROMOCIONAL: null });
    expect(erros).toHaveLength(0);
    expect(dto.VL_PRECO_PROMOCIONAL).toBeNull();
  });

  it('sem o campo, não mexe', () => {
    const { dto, erros } = validar({ NM_PRODUTO: 'Anel' });
    expect(erros).toHaveLength(0);
    expect(dto.VL_PRECO_PROMOCIONAL).toBeUndefined();
  });

  it('recusa valor negativo', () => {
    expect(validar({ VL_PRECO_PROMOCIONAL: -1 }).erros).not.toHaveLength(0);
  });
});
