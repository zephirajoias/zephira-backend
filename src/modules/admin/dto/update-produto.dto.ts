import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { CreateProdutoDto, CreateVariacaoDto } from './create-produto.dto';

export class UpdateProdutoDto extends PartialType(CreateProdutoDto) {}

export class UpdateVariacaoDto extends PartialType(CreateVariacaoDto) {
  // CD_VARIACAO é um ID numérico (o service faz Number(dto.CD_VARIACAO)),
  // mas chega como number de verdade no JSON enviado pelo front — não
  // como string. Estava com @IsString() aqui, rejeitando toda edição de
  // variação com "CD_VARIACAO must be a string".
  @Type(() => Number)
  @IsNumber()
  CD_VARIACAO: number;

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
