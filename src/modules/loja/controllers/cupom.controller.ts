import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ValidarCupomDto } from '../dto/validar-cupom.dto';
import { PedidosService } from '../services/pedidos.service';

// Público (sem guard), igual ao /frete/calcular: o carrinho confere o cupom
// antes do cliente estar logado/com endereço escolhido. O checkout confere
// tudo de novo na hora de criar o pedido — este endpoint é só preview.
@Controller('loja/cupons')
export class CupomController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Post('validar')
  async validar(
    @Res() res: Response,
    @Body() dto: ValidarCupomDto,
  ): Promise<any> {
    try {
      const result = await this.pedidosService.previewCupom(
        dto.DS_CODIGO,
        dto.VL_SUBTOTAL,
      );
      return res.status(200).send(result);
    } catch (err) {
      throw err;
    }
  }
}
