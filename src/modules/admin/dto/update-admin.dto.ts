import { PartialType } from '@nestjs/mapped-types';
import { IsEmpty, IsString } from 'class-validator';
import { CreateAdminDto } from './create-admin.dto';

export class UpdateAdminDto extends PartialType(CreateAdminDto) {
  @IsString()
  @IsEmpty()
  NM_CATEGORIA: string;

  @IsString()
  @IsEmpty()
  DS_SLUG: string;
}
