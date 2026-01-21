import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CategoriaCreateDto {
  @IsString()
  @IsNotEmpty()
  NM_CATEGORIA: string;

  @IsString()
  @IsNotEmpty()
  DS_SLUG: string;

  @IsString()
  @IsNotEmpty()
  DS_URL_IMAGEM: string;

  @IsNumber()
  @IsNotEmpty()
  SN_ATIVO: number;

  @IsNumber()
  CD_CATEGORIA_PAI: number;
}
