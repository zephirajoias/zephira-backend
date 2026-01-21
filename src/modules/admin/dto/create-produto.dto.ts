import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

// 1. Crie um DTO específico para a Variação (Filho)
export class CreateVariacaoDto {
  @IsNumber()
  @IsNotEmpty()
  CD_PRODUTO: string;

  @IsString()
  @IsNotEmpty()
  CD_SKU: string;

  @IsString()
  @IsNotEmpty()
  DS_TAMANHO: string;

  @IsNumber()
  @Min(0)
  QT_ESTOQUE: number;

  @IsString()
  @IsNotEmpty()
  DS_SLUG: string;
}

// 2. O DTO Principal (Pai)
export class CreateProdutoDto {
  @IsString()
  @IsNotEmpty()
  NM_PRODUTO: string;

  @IsString()
  @IsNotEmpty()
  DS_SLUG: string;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  CD_CATEGORIA: number;

  @IsString()
  @IsNotEmpty()
  DS_DESCRICAO: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  VL_PRECO: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariacaoDto)
  variacoes: CreateVariacaoDto[];

  @IsString()
  @IsIn(['S', 'N'])
  SN_PRINCIPAL: string;
}
