import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class UpdatePromocoesDto {
  @IsString()
  @IsNotEmpty()
  NM_PROMOCAO: string;

  @IsString()
  @IsNotEmpty()
  DS_CODIGO: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  VL_DESCONTO: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  SN_ATIVO: number;
}
