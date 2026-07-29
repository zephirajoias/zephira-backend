import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { UserJwtGuard } from 'src/modules/auth/guards/user-jwt.guard';
import { CreateEnderecoDto } from '../dto/create-endereco.dto';
import { UpdateEnderecoDto } from '../dto/update-endereco.dto';
import { EnderecosService } from '../services/enderecos.service';

@Controller('loja/enderecos')
@UseGuards(UserJwtGuard)
export class EnderecosController {
  constructor(private readonly enderecosService: EnderecosService) {}

  @Get()
  async listaEnderecos(@Req() req: any, @Res() res: Response): Promise<any> {
    try {
      const result = await this.enderecosService.listaEnderecos(
        req.user.userId,
      );
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Post()
  async createEndereco(
    @Req() req: any,
    @Res() res: Response,
    @Body() dto: CreateEnderecoDto,
  ): Promise<any> {
    try {
      const result = await this.enderecosService.createEndereco(
        req.user.userId,
        dto,
      );
      return res.status(201).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Put(':id')
  async updateEndereco(
    @Req() req: any,
    @Res() res: Response,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEnderecoDto,
  ): Promise<any> {
    try {
      const result = await this.enderecosService.updateEndereco(
        req.user.userId,
        id,
        dto,
      );
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Delete(':id')
  async deleteEndereco(
    @Req() req: any,
    @Res() res: Response,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<any> {
    try {
      const result = await this.enderecosService.deleteEndereco(
        req.user.userId,
        id,
      );
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }
}
