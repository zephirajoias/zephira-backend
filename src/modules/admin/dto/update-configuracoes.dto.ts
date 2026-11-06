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

  // Barra de avisos da home (frete grátis / parcelas sem juros).
  // Vazio/0 desliga o aviso correspondente — ver page.tsx do e-commerce.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  VL_FRETE_GRATIS_MINIMO?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  NR_PARCELAS_SEM_JUROS?: number;

  // Dados da empresa (Decreto 7.962/2013): rodapé e página Fale Conosco.
  @IsOptional()
  @IsString()
  NM_RAZAO_SOCIAL?: string;

  @IsOptional()
  @IsString()
  NR_CNPJ?: string;

  @IsOptional()
  @IsString()
  DS_ENDERECO_LOJA?: string;

  @IsOptional()
  @IsString()
  DS_INSTAGRAM?: string;

  // Texto do rodapé da home (as fotos de banner/Combinações têm rota de
  // upload própria — ver uploadImagemHome).
  @IsOptional()
  @IsString()
  DS_TEXTO_RODAPE?: string;

  // Brinde (caixinha de joia) a partir de X no carrinho. Vazio/0 desliga.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  VL_BRINDE_MINIMO?: number;
}
