// O serviço de produtos puxa o Supabase (exige variáveis de ambiente); aqui
// ele é substituído por um falso.
jest.mock('src/modules/admin/services/produtos.service', () => ({ ProdutosService: class {} }));

import { CadastroBotService } from './cadastro-bot.service';
import type { TgUpdate } from './telegram-api';

const CHAT = 111;

function montar() {
  const enviados: { texto: string; botoes: string[] }[] = [];
  const registrar = (texto: string, teclado?: { callback_data: string }[][]) =>
    enviados.push({ texto, botoes: (teclado ?? []).flat().map((b) => b.callback_data) });

  const api = {
    ligado: true,
    enviar: jest.fn(async (_c: number, texto: string, teclado?: any) => registrar(texto, teclado)),
    enviarFoto: jest.fn(async (_c: number, _f: string, texto: string, teclado?: any) =>
      registrar(texto, teclado),
    ),
    tirarBotoes: jest.fn(async () => undefined),
    responderClique: jest.fn(async () => undefined),
    baixarArquivo: jest.fn(async (id: string) => Buffer.from(`foto-${id}`)),
  };
  const prisma = {
    cATEGORIA: {
      findMany: jest.fn(async () => [
        {
          CD_CATEGORIA: 1,
          NM_CATEGORIA: 'Brinco',
          other_CATEGORIA: [
            { CD_CATEGORIA: 11, NM_CATEGORIA: 'Prata' },
            { CD_CATEGORIA: 12, NM_CATEGORIA: 'Ouro' },
          ],
        },
        { CD_CATEGORIA: 2, NM_CATEGORIA: 'Infantil', other_CATEGORIA: [] },
      ]),
    },
  };
  const produtos = {
    createProduto: jest.fn(async () => ({ CD_PRODUTO: 99, DS_SLUG: 'argola-prata' })),
  };
  const bot = new CadastroBotService(api as any, prisma as any, produtos as any);
  return { bot, api, produtos, enviados, ultimo: () => enviados[enviados.length - 1] };
}

const foto = (id: string, extra: object = {}): TgUpdate => ({
  update_id: 1,
  message: {
    message_id: 1,
    from: { id: 7 },
    chat: { id: CHAT },
    photo: [
      { file_id: `${id}-p`, width: 90, height: 90 },
      { file_id: id, width: 1280, height: 1280 },
    ],
    ...extra,
  },
});
const texto = (t: string, userId = 7): TgUpdate => ({
  update_id: 1,
  message: { message_id: 1, from: { id: userId }, chat: { id: CHAT }, text: t },
});
const clique = (data: string): TgUpdate => ({
  update_id: 1,
  callback_query: {
    id: 'cq',
    from: { id: 7 },
    data,
    message: { message_id: 5, chat: { id: CHAT } },
  },
});

describe('CadastroBotService', () => {
  beforeEach(() => {
    process.env.TELEGRAM_USUARIOS_PERMITIDOS = '7, 8';
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  async function fotosDoAlbum(bot: CadastroBotService, ids: string[]) {
    for (const id of ids) await bot.processar(foto(id, { media_group_id: 'g1' }));
    await jest.advanceTimersByTimeAsync(1600);
  }

  it('cadastro completo, do álbum ao publicar', async () => {
    const { bot, produtos, enviados, ultimo } = montar();

    await fotosDoAlbum(bot, ['a', 'b', 'c']);
    // Uma resposta só pro álbum inteiro, pedindo a categoria.
    expect(enviados).toHaveLength(1);
    expect(ultimo().texto).toContain('3 fotos');
    expect(ultimo().botoes).toEqual(['pai:1', 'pai:2']);

    await bot.processar(clique('pai:1'));
    expect(ultimo().botoes).toEqual(['cat:11', 'cat:12', 'voltar']);
    await bot.processar(clique('cat:11'));
    expect(ultimo().texto).toContain('nome');

    await bot.processar(texto('Argola Prata'));
    expect(ultimo().texto).toContain('preço');
    await bot.processar(texto('abc'));
    expect(ultimo().texto).toContain('Não entendi o preço');
    await bot.processar(texto('R$ 89,90'));
    expect(ultimo().texto).toContain('estoque');
    await bot.processar(texto('P 2, M 3'));
    expect(ultimo().botoes).toEqual(['pular']);
    await bot.processar(clique('pular'));

    expect(ultimo().texto).toContain('Argola Prata');
    expect(ultimo().texto).toContain('Brinco › Prata');
    expect(ultimo().texto).toContain('R$');
    expect(ultimo().texto).toContain('P: 2 · M: 3');
    expect(ultimo().botoes).toContain('publicar');

    await bot.processar(clique('publicar'));
    expect(produtos.createProduto).toHaveBeenCalledTimes(1);
    const [dto, arquivos] = (produtos.createProduto.mock.calls[0] as unknown) as [any, any[]];
    expect(dto).toMatchObject({
      NM_PRODUTO: 'Argola Prata',
      DS_SLUG: 'argola-prata',
      CD_CATEGORIA: 11,
      DS_DESCRICAO: '',
      VL_PRECO: 89.9,
      SN_PRINCIPAL: 'S',
      variacoes: [
        { DS_TAMANHO: 'P', QT_ESTOQUE: 2 },
        { DS_TAMANHO: 'M', QT_ESTOQUE: 3 },
      ],
    });
    // Maior tamanho de cada foto, na ordem do álbum.
    expect(arquivos.map((a) => a.buffer.toString())).toEqual(['foto-a', 'foto-b', 'foto-c']);
    expect(ultimo().texto).toContain('/produto/argola-prata');
  });

  it('legenda vira o nome, e a próxima peça oferece a mesma categoria', async () => {
    const { bot, ultimo } = montar();
    await bot.processar(foto('x', { caption: 'Brinco gota' }));
    await jest.advanceTimersByTimeAsync(1600);
    await bot.processar(clique('pai:2')); // categoria sem filhas
    expect(ultimo().texto).toContain('preço'); // pulou o nome
    await bot.processar(texto('50'));
    await bot.processar(texto('4'));
    await bot.processar(texto('Brinco leve'));
    expect(ultimo().texto).toContain('4 un.');
    await bot.processar(clique('publicar'));

    await bot.processar(foto('y'));
    await jest.advanceTimersByTimeAsync(1600);
    expect(ultimo().botoes[0]).toBe('mesma');
    await bot.processar(clique('mesma'));
    expect(ultimo().texto).toContain('nome');
  });

  it('corrigir um campo volta direto pro resumo', async () => {
    const { bot, ultimo } = montar();
    await bot.processar(foto('x', { caption: 'Anel' }));
    await jest.advanceTimersByTimeAsync(1600);
    await bot.processar(clique('pai:2'));
    await bot.processar(texto('50'));
    await bot.processar(texto('4'));
    await bot.processar(clique('pular'));
    await bot.processar(clique('editar:preco'));
    expect(ultimo().texto).toContain('preço');
    await bot.processar(texto('60'));
    expect(ultimo().botoes).toContain('publicar');
    expect(ultimo().texto).toContain('60,00');
  });

  it('se publicar falhar, mantém o rascunho e oferece tentar de novo', async () => {
    const { bot, produtos, ultimo } = montar();
    produtos.createProduto.mockRejectedValueOnce(new Error('Falha no upload da imagem'));
    await bot.processar(foto('x', { caption: 'Anel' }));
    await jest.advanceTimersByTimeAsync(1600);
    await bot.processar(clique('pai:2'));
    await bot.processar(texto('50'));
    await bot.processar(texto('4'));
    await bot.processar(clique('pular'));
    await bot.processar(clique('publicar'));
    expect(ultimo().texto).toContain('Falha no upload');
    expect(ultimo().botoes).toEqual(['publicar', 'cancelar']);
    await bot.processar(clique('publicar'));
    expect(produtos.createProduto).toHaveBeenCalledTimes(2);
    expect(ultimo().texto).toContain('publicada');
  });

  it('quem não está liberado recebe o próprio ID e nada é criado', async () => {
    const { bot, produtos, ultimo } = montar();
    await bot.processar(texto('/start', 999));
    expect(ultimo().texto).toContain('999');
    expect(produtos.createProduto).not.toHaveBeenCalled();
  });
});
