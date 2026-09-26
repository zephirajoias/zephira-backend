import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CreateVariacaoDto } from './create-produto.dto';

// Edição de produto (PUT admin/produtos/:id). Antes a rota aceitava
// qualquer corpo. Descrição pode ir vazia, como sempre pôde; campo vazio ou
// null é ignorado pelo serviço.
export class UpdateProdutoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  NM_PRODUTO?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  DS_DESCRICAO?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  VL_PRECO?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  CD_CATEGORIA?: number;
}

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
