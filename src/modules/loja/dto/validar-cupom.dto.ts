import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ValidarCupomDto {
  @IsString()
  @IsNotEmpty()
  DS_CODIGO: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  VL_SUBTOTAL: number;
}
