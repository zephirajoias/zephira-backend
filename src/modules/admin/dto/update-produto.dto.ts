import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { CreateProdutoDto, CreateVariacaoDto } from './create-produto.dto';

export class UpdateProdutoDto extends PartialType(CreateProdutoDto) {}

export class UpdateVariacaoDto extends PartialType(CreateVariacaoDto) {
  @IsString()
  @IsNotEmpty()
  CD_VARIACAO: string;

  @IsString()
  @IsNotEmpty()
  CD_SKU: string;

  @IsString()
  @IsNotEmpty()
  DS_TAMANHO: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  QT_ESTOQUE: number;
}
