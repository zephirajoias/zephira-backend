import { Module } from '@nestjs/common';
import { ProdutosService } from 'src/modules/admin/services/produtos.service';
import { CadastroBotService } from './cadastro-bot.service';
import { TelegramApi } from './telegram-api';
import { TelegramController } from './telegram.controller';

// Bot do Telegram pra cadastrar peças. Fica desligado (nenhum webhook, nenhuma
// resposta) enquanto TELEGRAM_BOT_TOKEN e TELEGRAM_WEBHOOK_SECRET não existirem.
@Module({
  controllers: [TelegramController],
  providers: [TelegramApi, CadastroBotService, ProdutosService],
})
export class TelegramModule {}
