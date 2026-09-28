import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { gerarSlug } from 'src/common/slug';
import { CreateProdutoDto } from 'src/modules/admin/dto/create-produto.dto';
import { ProdutosService } from 'src/modules/admin/services/produtos.service';
import { PrismaService } from 'src/prisma/services/prisma.service';
import {
  formatarReal,
  interpretarPreco,
  interpretarTamanhos,
  TamanhoEstoque,
} from './interpretar';
import {
  TelegramApi,
  Teclado,
  TgCallbackQuery,
  TgMessage,
  TgUpdate,
} from './telegram-api';

type Etapa =
  | 'fotos'
  | 'categoria'
  | 'nome'
  | 'preco'
  | 'tamanhos'
  | 'descricao'
  | 'confirmar'
  | 'publicando';

interface Categoria {
  id: number;
  nome: string;
}

interface Rascunho {
  fotos: string[];
  etapa: Etapa;
  categoria?: Categoria;
  nome?: string;
  preco?: number;
  tamanhos?: TamanhoEstoque[];
  descricao?: string | null; // null = pulou; undefined = ainda não respondeu
  atualizadoEm: number;
  timerFotos?: NodeJS.Timeout;
}

const MAX_FOTOS = 10;
const EXPIRA_MS = 6 * 60 * 60 * 1000;
const ESPERA_ALBUM_MS = 1500;

const escapar = (t: string) =>
  t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

const AJUDA = [
  '<b>Cadastro rápido da Zephira</b>',
  '',
  '1. Mande as fotos da peça. Pode mandar várias de uma vez; a primeira vira a capa.',
  '2. Escolha a categoria nos botões.',
  '3. Responda o nome, o preço e o estoque.',
  '4. Confira o resumo e toque em <b>Publicar</b>. A peça entra na loja na hora.',
  '',
  'Dica: escreva o nome da peça na legenda da foto e pule uma etapa.',
  '/cancelar descarta o cadastro em andamento.',
].join('\n');

/**
 * Bot do Telegram pra equipe cadastrar peças pelo celular. Conversa em
 * etapas; o rascunho de cada chat fica na memória da API (um deploy no meio
 * do cadastro perde o rascunho, e a pessoa recomeça). Publica usando o mesmo
 * ProdutosService.createProduto do admin: mesmas fotos otimizadas, mesmo
 * slug único, mesmo estoque.
 *
 * Só responde a quem está em TELEGRAM_USUARIOS_PERMITIDOS (IDs numéricos do
 * Telegram, separados por vírgula). Quem não está recebe o próprio ID pra
 * pedir acesso.
 */
@Injectable()
export class CadastroBotService implements OnModuleInit {
  private readonly logger = new Logger(CadastroBotService.name);
  private readonly rascunhos = new Map<number, Rascunho>();
  private readonly ultimaCategoria = new Map<number, Categoria>();

  constructor(
    private readonly api: TelegramApi,
    private readonly prismaService: PrismaService,
    private readonly produtosService: ProdutosService,
  ) {}

  async onModuleInit() {
    // Só a produção registra o webhook: rodar a API local com o mesmo token
    // apontaria o bot pro localhost e tiraria o bot de produção do ar.
    const segredo = process.env.TELEGRAM_WEBHOOK_SECRET;
    const backend = (process.env.BACKEND_URL ?? '').replace(/\/+$/, '');
    if (!this.api.ligado || !segredo || !backend || process.env.NODE_ENV !== 'production') {
      return;
    }
    try {
      await this.api.registrarWebhook(`${backend}/telegram/webhook`, segredo);
      this.logger.log('Webhook do Telegram registrado.');
    } catch (err) {
      this.logger.error(`Falha ao registrar webhook do Telegram: ${err}`);
    }
  }

  private permitido(userId?: number) {
    const lista = (process.env.TELEGRAM_USUARIOS_PERMITIDOS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return userId !== undefined && lista.includes(String(userId));
  }

  async processar(update: TgUpdate) {
    const chatId =
      update.message?.chat.id ?? update.callback_query?.message?.chat.id;
    try {
      if (update.callback_query) await this.tratarClique(update.callback_query);
      else if (update.message) await this.tratarMensagem(update.message);
    } catch (err) {
      this.logger.error(`Erro no bot (chat ${chatId}): ${err instanceof Error ? err.stack : err}`);
      if (chatId) {
        await this.api
          .enviar(chatId, 'Algo deu errado aqui. Tente de novo; se continuar, mande /cancelar e recomece.')
          .catch(() => undefined);
      }
    }
  }

  // ---------------------------------------------------------------- mensagens

  private async tratarMensagem(msg: TgMessage) {
    const chatId = msg.chat.id;
    if (!this.permitido(msg.from?.id)) {
      await this.api.enviar(
        chatId,
        `Este bot é da equipe da Zephira Joias.\nSeu ID do Telegram é <code>${msg.from?.id}</code>: mande esse número pra quem administra a loja liberar o seu acesso.`,
      );
      return;
    }

    const texto = (msg.text ?? '').trim();
    const comando = texto.startsWith('/') ? texto.split(/[\s@]/)[0].toLowerCase() : '';

    if (comando === '/start' || comando === '/ajuda') {
      await this.api.enviar(chatId, AJUDA);
      return;
    }
    if (comando === '/cancelar') {
      this.descartar(chatId);
      await this.api.enviar(chatId, 'Cadastro descartado. Mande as fotos da próxima peça quando quiser.');
      return;
    }
    if (comando === '/novo') {
      this.descartar(chatId);
      await this.api.enviar(chatId, 'Mande as fotos da peça (pode ser mais de uma).');
      return;
    }

    const fotoId = this.fotoDaMensagem(msg);
    if (fotoId) {
      this.adicionarFoto(chatId, fotoId, msg.caption);
      return;
    }

    const r = this.rascunho(chatId);
    if (!r) {
      await this.api.enviar(chatId, 'Para cadastrar uma peça, comece mandando as fotos dela.\n/ajuda mostra o passo a passo.');
      return;
    }
    await this.responderEtapa(chatId, r, texto);
  }

  private fotoDaMensagem(msg: TgMessage): string | null {
    if (msg.photo?.length) {
      // O Telegram manda vários tamanhos; o último é o maior.
      return msg.photo[msg.photo.length - 1].file_id;
    }
    // Foto enviada como arquivo (sem compressão).
    if (msg.document?.mime_type?.startsWith('image/')) return msg.document.file_id;
    return null;
  }

  private adicionarFoto(chatId: number, fileId: string, legenda?: string) {
    let r = this.rascunho(chatId);
    if (r?.etapa === 'publicando') {
      void this.api.enviar(chatId, 'Espere a peça anterior terminar de publicar e mande as fotos de novo.');
      return;
    }
    if (!r) {
      r = { fotos: [], etapa: 'fotos', atualizadoEm: Date.now() };
      this.rascunhos.set(chatId, r);
    }
    if (r.fotos.length >= MAX_FOTOS) return;
    r.fotos.push(fileId);
    r.atualizadoEm = Date.now();
    if (legenda?.trim() && !r.nome) r.nome = legenda.trim().slice(0, 120);

    // Um álbum chega como várias mensagens quase juntas: espera o álbum
    // terminar antes de responder, pra não mandar uma resposta por foto.
    const rascunho = r;
    if (rascunho.timerFotos) clearTimeout(rascunho.timerFotos);
    rascunho.timerFotos = setTimeout(() => {
      rascunho.timerFotos = undefined;
      const seguir =
        rascunho.etapa === 'fotos'
          ? this.avancar(chatId, rascunho)
          : this.api.enviar(chatId, `📷 Agora são ${rascunho.fotos.length} fotos.`);
      void Promise.resolve(seguir).catch((err) =>
        this.logger.error(`Erro após receber fotos (chat ${chatId}): ${err}`),
      );
    }, ESPERA_ALBUM_MS);
  }

  private async responderEtapa(chatId: number, r: Rascunho, texto: string) {
    switch (r.etapa) {
      case 'nome': {
        if (texto.length < 3 || texto.length > 120) {
          await this.api.enviar(chatId, 'O nome precisa ter entre 3 e 120 letras. Tente de novo.');
          return;
        }
        r.nome = texto;
        break;
      }
      case 'preco': {
        const preco = interpretarPreco(texto);
        if (preco === null) {
          await this.api.enviar(chatId, 'Não entendi o preço. Mande só o valor, por exemplo <b>89,90</b>.');
          return;
        }
        r.preco = preco;
        break;
      }
      case 'tamanhos': {
        const tamanhos = interpretarTamanhos(texto);
        if (!tamanhos) {
          await this.api.enviar(chatId, this.textoTamanhos(true));
          return;
        }
        r.tamanhos = tamanhos;
        break;
      }
      case 'descricao': {
        r.descricao = /^pular$/i.test(texto) ? null : texto.slice(0, 2000);
        break;
      }
      case 'fotos':
        await this.api.enviar(chatId, 'Mande primeiro as fotos da peça.');
        return;
      case 'publicando':
        await this.api.enviar(chatId, 'Publicando a peça, um instante...');
        return;
      default:
        await this.api.enviar(chatId, 'Use os botões da última mensagem, ou /cancelar para recomeçar.');
        return;
    }
    r.atualizadoEm = Date.now();
    await this.avancar(chatId, r);
  }

  /** Pergunta o primeiro dado que falta; se nada falta, mostra o resumo. */
  private async avancar(chatId: number, r: Rascunho) {
    if (!r.categoria) return this.pedirCategoria(chatId, r);
    if (!r.nome) {
      r.etapa = 'nome';
      return this.api.enviar(chatId, 'Qual o <b>nome</b> da peça?\nEx: Argola cravejada folheada a ouro');
    }
    if (r.preco === undefined) {
      r.etapa = 'preco';
      return this.api.enviar(chatId, 'Qual o <b>preço</b>? Ex: 89,90');
    }
    if (!r.tamanhos) {
      r.etapa = 'tamanhos';
      return this.api.enviar(chatId, this.textoTamanhos(false));
    }
    if (r.descricao === undefined) {
      r.etapa = 'descricao';
      return this.api.enviar(chatId, 'Uma <b>descrição</b> curta da peça (material, tamanho, detalhes)?', [
        [{ text: 'Pular', callback_data: 'pular' }],
      ]);
    }
    return this.mostrarResumo(chatId, r);
  }

  private textoTamanhos(erro: boolean) {
    return [
      erro ? 'Não entendi o estoque.' : 'Quantas peças tem em <b>estoque</b>?',
      '• Tamanho único: mande só a quantidade, ex: <b>5</b>',
      '• Com tamanhos: tamanho e quantidade, ex: <b>P 2, M 3, G 1</b> ou <b>17 2, 18 1</b>',
    ].join('\n');
  }

  // ---------------------------------------------------------------- categoria

  private async categorias() {
    return this.prismaService.cATEGORIA.findMany({
      where: { SN_ATIVO: 1, CD_CATEGORIA_PAI: null },
      orderBy: { NM_CATEGORIA: 'asc' },
      select: {
        CD_CATEGORIA: true,
        NM_CATEGORIA: true,
        other_CATEGORIA: {
          where: { SN_ATIVO: 1 },
          orderBy: { NM_CATEGORIA: 'asc' },
          select: { CD_CATEGORIA: true, NM_CATEGORIA: true },
        },
      },
    });
  }

  private async pedirCategoria(chatId: number, r: Rascunho) {
    r.etapa = 'categoria';
    const lista = await this.categorias();
    const teclado: Teclado = [];
    const ultima = this.ultimaCategoria.get(chatId);
    if (ultima) teclado.push([{ text: `↩️ Mesma da anterior: ${ultima.nome}`, callback_data: 'mesma' }]);
    for (let i = 0; i < lista.length; i += 2) {
      teclado.push(
        lista.slice(i, i + 2).map((c) => ({ text: c.NM_CATEGORIA, callback_data: `pai:${c.CD_CATEGORIA}` })),
      );
    }
    const fotos = r.fotos.length === 1 ? '1 foto' : `${r.fotos.length} fotos`;
    await this.api.enviar(chatId, `📷 ${fotos} recebida(s). Qual a <b>categoria</b>?`, teclado);
  }

  // ---------------------------------------------------------------- cliques

  private async tratarClique(cq: TgCallbackQuery) {
    const chatId = cq.message?.chat.id;
    if (!chatId || !this.permitido(cq.from.id)) {
      await this.api.responderClique(cq.id, 'Sem acesso.');
      return;
    }
    await this.api.responderClique(cq.id);
    // Tira os botões da mensagem clicada: um segundo clique num botão velho
    // não pode bagunçar o cadastro.
    if (cq.message) await this.api.tirarBotoes(chatId, cq.message.message_id);

    const r = this.rascunho(chatId);
    if (!r) {
      await this.api.enviar(chatId, 'Esse cadastro não existe mais. Mande as fotos para começar outro.');
      return;
    }
    const [acao, valor] = (cq.data ?? '').split(':');
    r.atualizadoEm = Date.now();

    switch (acao) {
      case 'mesma': {
        const ultima = this.ultimaCategoria.get(chatId);
        if (!ultima) return this.pedirCategoria(chatId, r);
        r.categoria = ultima;
        return this.avancar(chatId, r);
      }
      case 'pai': {
        const lista = await this.categorias();
        const pai = lista.find((c) => c.CD_CATEGORIA === Number(valor));
        if (!pai) return this.pedirCategoria(chatId, r);
        if (pai.other_CATEGORIA.length === 0) {
          return this.definirCategoria(chatId, r, { id: pai.CD_CATEGORIA, nome: pai.NM_CATEGORIA });
        }
        const teclado: Teclado = [
          pai.other_CATEGORIA.map((f) => ({
            text: f.NM_CATEGORIA,
            callback_data: `cat:${f.CD_CATEGORIA}`,
          })),
          [{ text: '⬅️ Voltar', callback_data: 'voltar' }],
        ];
        return this.api.enviar(chatId, `<b>${escapar(pai.NM_CATEGORIA)}</b> de qual material?`, teclado);
      }
      case 'cat': {
        const lista = await this.categorias();
        for (const pai of lista) {
          const filha = pai.other_CATEGORIA.find((f) => f.CD_CATEGORIA === Number(valor));
          if (filha) {
            return this.definirCategoria(chatId, r, {
              id: filha.CD_CATEGORIA,
              nome: `${pai.NM_CATEGORIA} › ${filha.NM_CATEGORIA}`,
            });
          }
        }
        return this.pedirCategoria(chatId, r);
      }
      case 'voltar':
        return this.pedirCategoria(chatId, r);
      case 'pular':
        if (r.etapa !== 'descricao') return this.avancar(chatId, r);
        r.descricao = null;
        return this.avancar(chatId, r);
      case 'editar': {
        // Apaga o campo e deixa o avancar() perguntar de novo; como o resto
        // já está preenchido, volta direto pro resumo depois.
        if (valor === 'categoria') r.categoria = undefined;
        if (valor === 'nome') r.nome = undefined;
        if (valor === 'preco') r.preco = undefined;
        if (valor === 'tamanhos') r.tamanhos = undefined;
        if (valor === 'descricao') r.descricao = undefined;
        return this.avancar(chatId, r);
      }
      case 'cancelar':
        this.descartar(chatId);
        return this.api.enviar(chatId, 'Cadastro descartado. Mande as fotos da próxima peça quando quiser.');
      case 'publicar':
        return this.publicar(chatId, r);
      default:
        return this.avancar(chatId, r);
    }
  }

  private definirCategoria(chatId: number, r: Rascunho, categoria: Categoria) {
    r.categoria = categoria;
    this.ultimaCategoria.set(chatId, categoria);
    return this.avancar(chatId, r);
  }

  // ---------------------------------------------------------------- resumo

  private async mostrarResumo(chatId: number, r: Rascunho) {
    r.etapa = 'confirmar';
    const estoque = r.tamanhos!
      .map((t) => (t.DS_TAMANHO === 'U' ? `${t.QT_ESTOQUE} un.` : `${escapar(t.DS_TAMANHO)}: ${t.QT_ESTOQUE}`))
      .join(' · ');
    const legenda = [
      `<b>${escapar(r.nome!)}</b>`,
      `Categoria: ${escapar(r.categoria!.nome)}`,
      `Preço: ${formatarReal(r.preco!)}`,
      `Estoque: ${estoque}`,
      `Fotos: ${r.fotos.length}`,
      r.descricao ? `\n${escapar(r.descricao.slice(0, 600))}` : 'Sem descrição',
    ].join('\n');
    const teclado: Teclado = [
      [
        { text: '✅ Publicar', callback_data: 'publicar' },
        { text: '❌ Cancelar', callback_data: 'cancelar' },
      ],
      [
        { text: '✏️ Nome', callback_data: 'editar:nome' },
        { text: '✏️ Preço', callback_data: 'editar:preco' },
        { text: '✏️ Estoque', callback_data: 'editar:tamanhos' },
      ],
      [
        { text: '✏️ Categoria', callback_data: 'editar:categoria' },
        { text: '✏️ Descrição', callback_data: 'editar:descricao' },
      ],
    ];
    await this.api.enviarFoto(chatId, r.fotos[0], legenda, teclado);
  }

  // ---------------------------------------------------------------- publicar

  private async publicar(chatId: number, r: Rascunho) {
    if (r.etapa !== 'confirmar') return this.avancar(chatId, r);
    r.etapa = 'publicando';
    await this.api.enviar(chatId, '⏳ Publicando...');

    try {
      const arquivos = [] as Express.Multer.File[];
      for (const [i, fileId] of r.fotos.entries()) {
        const buffer = await this.api.baixarArquivo(fileId);
        arquivos.push({
          buffer,
          size: buffer.length,
          mimetype: 'image/jpeg',
          originalname: `telegram-${i + 1}.jpg`,
          fieldname: 'files',
        } as Express.Multer.File);
      }

      const dto = {
        NM_PRODUTO: r.nome!,
        DS_SLUG: gerarSlug(r.nome!),
        CD_CATEGORIA: r.categoria!.id,
        DS_DESCRICAO: r.descricao ?? '',
        VL_PRECO: r.preco!,
        SN_PRINCIPAL: 'S',
        variacoes: r.tamanhos!,
      } as unknown as CreateProdutoDto;

      const produto = await this.produtosService.createProduto(dto, arquivos);
      this.descartar(chatId);

      const loja = (process.env.USER_FRONTEND_URL ?? 'https://www.zephirajoias.com.br').replace(/\/+$/, '');
      await this.api.enviar(
        chatId,
        `✅ <b>${escapar(r.nome!)}</b> publicada.\n<a href="${loja}/produto/${produto.DS_SLUG}">Ver na loja</a>\n\nMande as fotos da próxima peça.`,
      );
    } catch (err) {
      this.logger.error(`Falha ao publicar pelo Telegram (chat ${chatId}): ${err instanceof Error ? err.stack : err}`);
      r.etapa = 'confirmar';
      const motivo = err instanceof Error ? err.message : 'erro desconhecido';
      await this.api.enviar(chatId, `❌ Não consegui publicar (${escapar(motivo)}). Tente de novo:`, [
        [
          { text: '✅ Tentar de novo', callback_data: 'publicar' },
          { text: '❌ Cancelar', callback_data: 'cancelar' },
        ],
      ]);
    }
  }

  // ---------------------------------------------------------------- estado

  private rascunho(chatId: number): Rascunho | undefined {
    const r = this.rascunhos.get(chatId);
    if (r && Date.now() - r.atualizadoEm > EXPIRA_MS) {
      this.descartar(chatId);
      return undefined;
    }
    return r;
  }

  private descartar(chatId: number) {
    const r = this.rascunhos.get(chatId);
    if (r?.timerFotos) clearTimeout(r.timerFotos);
    this.rascunhos.delete(chatId);
  }
}
