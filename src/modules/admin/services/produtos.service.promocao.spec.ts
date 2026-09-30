// O serviço puxa o Supabase no import (exige variáveis de ambiente); aqui
// ele é substituído por um falso, como em telegram/cadastro-bot.service.spec.ts.
jest.mock('src/common/supabase/supabase.provider', () => ({ supabaseAdmin: {} }));

import { BadRequestException } from '@nestjs/common';
import { ProdutosService } from './produtos.service';

function montarPrismaFalso() {
  const executeRaw = jest.fn(async () => 7);
  return { prisma: { $executeRaw: executeRaw } as any, executeRaw };
}

describe('ProdutosService — promoção em massa', () => {
  it.each([0, -5, 91, NaN])('recusa percentual %s sem tocar no banco', async (percentual) => {
    const { prisma, executeRaw } = montarPrismaFalso();
    const service = new ProdutosService(prisma);
    await expect(service.aplicarPromocaoEmMassa(percentual)).rejects.toThrow(
      BadRequestException,
    );
    expect(executeRaw).not.toHaveBeenCalled();
  });

  it('aplica em todas as peças ativas quando não passa categoria', async () => {
    const { prisma, executeRaw } = montarPrismaFalso();
    const service = new ProdutosService(prisma);
    const resultado = await service.aplicarPromocaoEmMassa(20);
    expect(resultado).toEqual({ produtosAfetados: 7 });
    expect(executeRaw).toHaveBeenCalledTimes(1);
  });

  it('remove a promoção em massa (todas, ou por categoria)', async () => {
    const { prisma, executeRaw } = montarPrismaFalso();
    const service = new ProdutosService(prisma);
    await service.removerPromocaoEmMassa();
    await service.removerPromocaoEmMassa(11);
    expect(executeRaw).toHaveBeenCalledTimes(2);
  });
});
