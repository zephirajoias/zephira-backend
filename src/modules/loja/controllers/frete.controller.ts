import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { SuperFreteService } from '../services/superfrete.service';

@Controller('frete')
export class FreteController {
  constructor(private readonly superFreteService: SuperFreteService) {}

  @Get('calcular')
  async calcular(
    @Res() res: Response,
    @Query('cep') cep: string,
  ): Promise<any> {
    try {
      if (!cep || cep.replace(/\D/g, '').length !== 8) {
        return res.status(400).send({ message: 'CEP inválido.' });
      }

      const opcoes = await this.superFreteService.calcularFrete(cep);
      return res.status(200).send(opcoes);
    } catch (err) {
      console.log(err);
      return res.status(409).send({ message: 'Erro ao calcular o frete.' });
    }
  }
}
