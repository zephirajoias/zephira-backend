import { Body, Controller, Get, Put, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { UpdateConfiguracoesDto } from '../dto/update-configuracoes.dto';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { ConfiguracoesService } from '../services/configuracoes.service';

@Controller('admin')
@UseGuards(AdminJwtGuard)
export class ConfiguracoesController {
  constructor(private readonly configuracoesService: ConfiguracoesService) {}

  @Get('configuracoes/gerais')
  async getConfiguracoesGerais(@Res() res: Response): Promise<any> {
    try {
      const result = await this.configuracoesService.getConfiguracoesGerais();
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Put('configuracoes/gerais')
  async updateConfiguracoesGerais(
    @Res() res: Response,
    @Body() dto: UpdateConfiguracoesDto,
  ): Promise<any> {
    try {
      const result =
        await this.configuracoesService.updateConfiguracoesGerais(dto);
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }
}
