import { IsDate, IsNotEmpty, IsString } from 'class-validator';

export class CreateAdminDto {
  @IsString()
  @IsNotEmpty()
  NM_USUARIO: string;

  @IsString()
  @IsNotEmpty()
  DS_EMAIL: string;

  @IsString()
  @IsNotEmpty()
  DS_SENHA: string;

  @IsString()
  @IsNotEmpty()
  NR_TELEFONE: string;

  @IsDate()
  TS_CRIACAO: Date;

  @IsDate()
  TS_ATUALIZACAO: Date;
}

export class loginAdminDto {
  @IsString()
  @IsNotEmpty()
  DS_EMAIL: string;

  @IsString()
  @IsNotEmpty()
  DS_SENHA: string;
}
