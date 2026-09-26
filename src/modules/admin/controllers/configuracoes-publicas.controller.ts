import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { ConfiguracoesService } from '../services/configuracoes.service';

// Endpoint público de propósito: o favicon/nome da loja precisam aparecer
// no <head> do site e do admin antes de qualquer login (e para o site,
// nunca tem login nenhum).
@Controller('configuracoes')
export class ConfiguracoesPublicasController {
  constructor(private readonly configuracoesService: ConfiguracoesService) {}

  @Get('publicas')
  async getConfiguracoesPublicas(@Res() res: Response): Promise<any> {
    try {
      const result = await this.configuracoesService.getConfiguracoesPublicas();
      return res.status(200).send(result);
    } catch (err) {
      throw err;
    }
  }
}
