import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CheckoutItemDto {
  @IsInt()
  @IsPositive()
  CD_VARIACAO: number;

  @IsInt()
  @IsPositive()
  QT_ITEM: number;
}

export class CheckoutDto {
  @IsInt()
  @IsPositive()
  CD_ENDERECO: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  itens: CheckoutItemDto[];

  @IsOptional()
  @IsString()
  TP_METODO_PAGAMENTO?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  DS_CODIGO_PROMOCIONAL?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  VL_FRETE?: number;
}
