import { PartialType } from '@nestjs/mapped-types';
import { IsEmpty, IsString, MinLength } from 'class-validator';
import { CreateAdminDto } from './create-admin.dto';

export class UpdateAdminDto extends PartialType(CreateAdminDto) {
  @IsString()
  @IsEmpty()
  NM_CATEGORIA: string;

  @IsString()
  @IsEmpty()
  DS_SLUG: string;
}

export class UpdatePasswordDto {
  @IsString()
  email: string;

  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter no mínimo 6 caracteres' })
  newPassword: string;
}
