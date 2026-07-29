import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePromocoesDto {
  @IsOptional()
  @IsString()
  NM_PROMOCAO?: string;

  @IsOptional()
  @IsString()
  DS_CODIGO?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  VL_DESCONTO?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  SN_ATIVO?: number;
}
