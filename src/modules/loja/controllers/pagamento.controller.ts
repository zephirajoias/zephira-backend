import { Body, Controller, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { PagamentoService } from '../services/pagamento.service';

@Controller('pagamentos')
export class PagamentoController {
  constructor(private readonly pagamentoService: PagamentoService) {}

  @Post('webhook')
  async webhook(
    @Body() body: any,
    @Query() query: any,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const tipo = body?.type ?? query?.type ?? query?.topic;
      const paymentId = body?.data?.id ?? query?.['data.id'] ?? query?.id;

      if (tipo === 'payment' && paymentId) {
        await this.pagamentoService.processarWebhook(String(paymentId));
      }

      // O Mercado Pago só precisa de um 200 confirmando o recebimento.
      return res.status(200).send();
    } catch (err) {
      console.log(err);
      // Retorna 200 mesmo em erro interno para evitar retries agressivos
      // por payloads que nunca vamos conseguir processar (ex: teste do painel).
      return res.status(200).send();
    }
  }
}
