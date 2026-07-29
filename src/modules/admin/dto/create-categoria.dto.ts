import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CategoriaCreateDto {
  @IsString()
  @IsNotEmpty()
  NM_CATEGORIA: string;

  @IsString()
  @IsNotEmpty()
  DS_SLUG: string;

  @IsOptional()
  @IsString()
  DS_URL_IMAGEM?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  SN_ATIVO?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  CD_CATEGORIA_PAI?: number;
}
