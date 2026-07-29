import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { UserJwtGuard } from 'src/modules/auth/guards/user-jwt.guard';
import { CheckoutDto } from '../dto/checkout.dto';
import { PedidosService } from '../services/pedidos.service';

@Controller('loja/pedidos')
@UseGuards(UserJwtGuard)
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Post('checkout')
  async checkout(
    @Req() req: any,
    @Res() res: Response,
    @Body() dto: CheckoutDto,
  ): Promise<any> {
    try {
      const result = await this.pedidosService.checkout(req.user.userId, dto);
      return res.status(201).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Get()
  async meusPedidos(
    @Req() req: any,
    @Res() res: Response,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<any> {
    try {
      const result = await this.pedidosService.meusPedidos(
        req.user.userId,
        Number(page) || 1,
        Number(limit) || 20,
      );
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Get(':id')
  async meuPedidoDetalhes(
    @Req() req: any,
    @Res() res: Response,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<any> {
    try {
      const result = await this.pedidosService.meuPedidoDetalhes(
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
