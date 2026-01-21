import { PartialType } from '@nestjs/mapped-types';
import { IsEmpty, IsString } from 'class-validator';
import { CategoriaCreateDto } from './create-categoria.dto';

export class UpdateCategoriaDto extends PartialType(CategoriaCreateDto) {
  @IsString()
  @IsEmpty()
  NM_CATEGORIA: string;

  @IsString()
  @IsEmpty()
  DS_SLUG: string;
}
