import { STATUS_PEDIDO } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdatePedidoStatusDto {
  @IsEnum(STATUS_PEDIDO)
  TP_STATUS: STATUS_PEDIDO;

  @IsOptional()
  @IsString()
  CD_RASTREIO?: string;
}
