import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CreatePromocoesDto } from '../dto/create-promocoes.dto';
import { UpdatePromocoesDto } from '../dto/update-promocao.dto';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { PromocoesService } from '../services/promocoes.service';

@Controller('admin')
@UseGuards(AdminJwtGuard)
export class PromocoesController {
  constructor(private readonly promocoesService: PromocoesService) {}

  @Post('promocoes')
  async createPromocao(
    @Res() res: Response,
    @Body() dto: CreatePromocoesDto,
  ): Promise<any> {
    try {
      const result = await this.promocoesService.createPromocao(dto);
      return res.status(201).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Get('promocoes')
  async listaPromocoes(@Res() res: Response): Promise<any> {
    try {
      const result = await this.promocoesService.listaPromocoes();
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Get('promocoes/tipos')
  async listaTiposPromocoes(@Res() res: Response): Promise<any> {
    try {
      const result = await this.promocoesService.listaTiposPromocoes();
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Put('promocoes/:promocaoId')
  async editaPromocao(
    @Res() res: Response,
    @Body() dto: UpdatePromocoesDto,
    @Param('promocaoId') promocaoId: number,
  ): Promise<any> {
    try {
      const result = await this.promocoesService.editaPromocao(dto, promocaoId);
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Delete('promocoes/:promocaoId')
  async deletePromocao(
    @Res() res: Response,
    @Param('promocaoId') promocaoId: number,
  ): Promise<any> {
    try {
      const result = await this.promocoesService.deletePromocao(promocaoId);
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }
}
