import { PartialType } from '@nestjs/mapped-types';
import { CategoriaCreateDto } from './create-categoria.dto';

export class UpdateCategoriaDto extends PartialType(CategoriaCreateDto) {}
