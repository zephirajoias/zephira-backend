import { BadRequestException } from '@nestjs/common';
import { PaginasService } from './paginas.service';

function montarPrismaFalso() {
  const upsert = jest.fn(async ({ create }: any) => create);
  return { prisma: { pAGINA_INSTITUCIONAL: { upsert } } as any, upsert };
}

describe('PaginasService.atualiza', () => {
  it('recusa slug desconhecido', async () => {
    const { prisma } = montarPrismaFalso();
    const service = new PaginasService(prisma);
    await expect(
      service.atualiza('nao-existe', { NM_TITULO: 'x', DS_CONTEUDO: 'y' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('salva texto normal em qualquer página que não seja faq', async () => {
    const { prisma, upsert } = montarPrismaFalso();
    const service = new PaginasService(prisma);
    await service.atualiza('sobre', { NM_TITULO: 'Sobre', DS_CONTEUDO: 'Texto qualquer' });
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('aceita faq com JSON válido de perguntas e respostas', async () => {
    const { prisma, upsert } = montarPrismaFalso();
    const service = new PaginasService(prisma);
    await service.atualiza('faq', {
      NM_TITULO: 'FAQ',
      DS_CONTEUDO: JSON.stringify([{ p: 'Pergunta?', r: 'Resposta.' }]),
    });
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it.each(['não é json', '{"p":"sem array"}', '[{"p":"sem resposta"}]'])(
    'recusa faq com conteúdo inválido: %s',
    async (conteudo) => {
      const { prisma } = montarPrismaFalso();
      const service = new PaginasService(prisma);
      await expect(
        service.atualiza('faq', { NM_TITULO: 'FAQ', DS_CONTEUDO: conteudo }),
      ).rejects.toThrow(BadRequestException);
    },
  );
});
