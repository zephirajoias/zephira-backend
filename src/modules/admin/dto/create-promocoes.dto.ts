import { TYPE_PROMOCAO } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreatePromocoesDto {
  @IsString()
  @IsNotEmpty()
  NM_PROMOCAO: string;

  @IsString()
  @IsNotEmpty()
  DS_CODIGO: string;

  @IsNotEmpty()
  TP_PROMOCAO: TYPE_PROMOCAO;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  VL_DESCONTO: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  VL_PEDIDO_MINIMO: number;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  DT_INICIO: Date;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  DT_FIM: Date;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  QT_USOS_ATUAL: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  QT_LIMITE_USO: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  SN_ATIVO: number;
}
