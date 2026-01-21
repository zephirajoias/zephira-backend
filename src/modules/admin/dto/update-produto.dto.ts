import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { CreateProdutoDto, CreateVariacaoDto } from './create-produto.dto';

export class UpdateProdutoDto extends PartialType(CreateProdutoDto) {}

export class UpdateVariacaoDto extends PartialType(CreateVariacaoDto) {
  @IsString()
  @IsNotEmpty()
  CD_VARIACAO: string;

  @IsString()
  @IsNotEmpty()
  DS_TAMANHO: string;

  @IsNumber()
  @Min(0)
  QT_ESTOQUE: number;
}
