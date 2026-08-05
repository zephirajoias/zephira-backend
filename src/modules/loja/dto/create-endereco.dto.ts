import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateEnderecoDto {
  @IsString()
  @IsNotEmpty()
  NR_CEP: string;

  @IsString()
  @IsNotEmpty()
  NM_LOGRADOURO: string;

  @IsString()
  @IsNotEmpty()
  NR_NUMERO: string;

  @IsOptional()
  @IsString()
  DS_COMPLEMENTO?: string;

  @IsString()
  @IsNotEmpty()
  NM_BAIRRO: string;

  @IsString()
  @IsNotEmpty()
  NM_CIDADE: string;

  @IsString()
  @Length(2, 2)
  DS_UF: string;

  @IsOptional()
  @IsString()
  DS_DOCUMENTO?: string;
}
