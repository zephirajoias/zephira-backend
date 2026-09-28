import { Injectable, Logger } from '@nestjs/common';

// Só os pedaços da Bot API do Telegram que o bot usa.
// https://core.telegram.org/bots/api

export interface TgUser {
  id: number;
  first_name?: string;
}

export interface TgPhotoSize {
  file_id: string;
  file_size?: number;
  width: number;
  height: number;
}

export interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: { id: number };
  text?: string;
  caption?: string;
  photo?: TgPhotoSize[];
  document?: { file_id: string; mime_type?: string; file_name?: string };
  media_group_id?: string;
}

export interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

export type Botao = { text: string; callback_data: string };
export type Teclado = Botao[][];

@Injectable()
export class TelegramApi {
  private readonly logger = new Logger(TelegramApi.name);

  get token() {
    return process.env.TELEGRAM_BOT_TOKEN ?? '';
  }

  get ligado() {
    return Boolean(this.token);
  }

  async chamar<T = unknown>(metodo: string, corpo: Record<string, unknown>): Promise<T> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${metodo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(20000),
    });
    const json = (await res.json().catch(() => null)) as { ok: boolean; result: T; description?: string } | null;
    if (!json?.ok) {
      throw new Error(`Telegram ${metodo}: ${json?.description ?? res.status}`);
    }
    return json.result;
  }

  enviar(chatId: number, texto: string, teclado?: Teclado) {
    return this.chamar<TgMessage>('sendMessage', {
      chat_id: chatId,
      text: texto,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...(teclado ? { reply_markup: { inline_keyboard: teclado } } : {}),
    });
  }

  enviarFoto(chatId: number, fileId: string, legenda: string, teclado?: Teclado) {
    return this.chamar<TgMessage>('sendPhoto', {
      chat_id: chatId,
      photo: fileId,
      caption: legenda,
      parse_mode: 'HTML',
      ...(teclado ? { reply_markup: { inline_keyboard: teclado } } : {}),
    });
  }

  /** Tira os botões de uma mensagem já respondida (evita clique duplo). */
  async tirarBotoes(chatId: number, messageId: number) {
    await this.chamar('editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    }).catch(() => undefined);
  }

  responderClique(callbackId: string, texto?: string) {
    return this.chamar('answerCallbackQuery', {
      callback_query_id: callbackId,
      ...(texto ? { text: texto } : {}),
    }).catch(() => undefined);
  }

  /** Baixa um arquivo (foto) enviado ao bot. */
  async baixarArquivo(fileId: string): Promise<Buffer> {
    const arquivo = await this.chamar<{ file_path: string }>('getFile', { file_id: fileId });
    const res = await fetch(
      `https://api.telegram.org/file/bot${this.token}/${arquivo.file_path}`,
      { signal: AbortSignal.timeout(60000) },
    );
    if (!res.ok) throw new Error(`Falha ao baixar foto do Telegram (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }

  async registrarWebhook(url: string, segredo: string) {
    await this.chamar('setWebhook', {
      url,
      secret_token: segredo,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: false,
    });
    await this.chamar('setMyCommands', {
      commands: [
        { command: 'novo', description: 'Começar o cadastro de uma peça' },
        { command: 'cancelar', description: 'Descartar o cadastro em andamento' },
        { command: 'ajuda', description: 'Como usar o bot' },
      ],
    }).catch((e) => this.logger.warn(`setMyCommands: ${e}`));
  }
}
