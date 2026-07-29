import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  NM_USUARIO: string;

  @IsString()
  @IsNotEmpty()
  DS_EMAIL: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  DS_SENHA: string;

  @IsOptional()
  @IsString()
  NR_TELEFONE?: string;
}

export class LoginUserDto {
  @IsString()
  @IsNotEmpty()
  DS_EMAIL: string;

  @IsString()
  @IsNotEmpty()
  DS_SENHA: string;
}
