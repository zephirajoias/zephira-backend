import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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

  // Remetente (usado no cálculo/compra de frete no SuperFrete)
  @IsOptional()
  @IsString()
  NM_REMETENTE?: string;

  @IsOptional()
  @IsString()
  NR_CEP_REMETENTE?: string;

  @IsOptional()
  @IsString()
  DS_ENDERECO_REMETENTE?: string;

  @IsOptional()
  @IsString()
  NR_NUMERO_REMETENTE?: string;

  @IsOptional()
  @IsString()
  NM_BAIRRO_REMETENTE?: string;

  @IsOptional()
  @IsString()
  NM_CIDADE_REMETENTE?: string;

  @IsOptional()
  @IsString()
  DS_UF_REMETENTE?: string;

  // Pacote padrão (usado no cálculo de frete)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  NR_PACOTE_ALTURA?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  NR_PACOTE_LARGURA?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  NR_PACOTE_COMPRIMENTO?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  NR_PACOTE_PESO?: number;
}
