import { PERFIL_USUARIO } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateAdminDto {
  @IsOptional()
  @IsString()
  NM_USUARIO?: string;

  @IsOptional()
  @IsString()
  NR_TELEFONE?: string;

  @IsOptional()
  @IsEnum(PERFIL_USUARIO)
  TP_PERFIL?: PERFIL_USUARIO;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  DS_SENHA?: string;
}

export class UpdateMeuPerfilDto {
  @IsOptional()
  @IsString()
  NM_USUARIO?: string;

  @IsOptional()
  @IsEmail()
  DS_EMAIL?: string;
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
