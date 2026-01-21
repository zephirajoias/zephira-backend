import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateConfiguracoesDto {
  @IsString()
  @IsNotEmpty()
  NM_LOJA: string;

  @IsString()
  @IsNotEmpty()
  DS_EMAIL_SUPORTE: string;

  @IsString()
  @IsNotEmpty()
  NR_TELEFONE: string;

  @IsString()
  @IsNotEmpty()
  SG_MOEDA: string;

  @IsString()
  @IsNotEmpty()
  DS_FUSO_HORARIO: string;
}
