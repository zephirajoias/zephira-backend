import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { UpdatePedidoStatusDto } from '../dto/update-pedido-status.dto';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { PedidosService } from '../services/pedidos.service';

@Controller('admin')
@UseGuards(AdminJwtGuard)
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get('pedidos')
  async listaPedidos(
    @Res() res: Response,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<any> {
    try {
      const result = await this.pedidosService.listaPedidos(
        Number(page) || 1,
        Number(limit) || 20,
      );
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Get('pedidos/:id')
  async pedidoDetalhes(
    @Res() res: Response,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<any> {
    try {
      const result = await this.pedidosService.pedidoDetalhes(id);
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Put('pedidos/:id/status')
  async atualizaStatus(
    @Res() res: Response,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePedidoStatusDto,
  ): Promise<any> {
    try {
      const result = await this.pedidosService.atualizaStatus(id, dto);
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }
}
