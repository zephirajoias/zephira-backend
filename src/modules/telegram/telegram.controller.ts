import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'crypto';
import { CadastroBotService } from './cadastro-bot.service';
import type { TgUpdate } from './telegram-api';

@SkipThrottle()
@Controller('telegram')
export class TelegramController {
  constructor(private readonly bot: CadastroBotService) {}

  // O Telegram manda cada mensagem do bot pra cá, com o segredo combinado no
  // setWebhook no cabeçalho. Responde 200 na hora e processa em seguida:
  // baixar e subir fotos pode demorar, e o Telegram reenviaria o update.
  @Post('webhook')
  @HttpCode(200)
  receber(
    @Headers('x-telegram-bot-api-secret-token') segredo: string | undefined,
    @Body() update: TgUpdate,
  ) {
    const esperado = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';
    const recebido = segredo ?? '';
    if (
      !esperado ||
      recebido.length !== esperado.length ||
      !timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado))
    ) {
      throw new UnauthorizedException();
    }
    void this.bot.processar(update);
    return { ok: true };
  }
}
