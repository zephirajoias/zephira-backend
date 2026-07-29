import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

// 1. DTO da variação usada na rota separada POST /produto/:produtoId/variacao
// (CD_PRODUTO vem da URL e CD_SKU é gerado no service, então não são obrigatórios aqui)
export class CreateVariacaoDto {
  @IsOptional()
  @IsString()
  CD_PRODUTO?: string;

  @IsOptional()
  @IsString()
  CD_SKU?: string;

  @IsString()
  @IsNotEmpty()
  DS_TAMANHO: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  QT_ESTOQUE: number;

  @IsString()
  @IsNotEmpty()
  DS_SLUG: string;
}

// 1.1. Variação enviada dentro do array "variacoes" na criação do produto
// (o SKU é gerado a partir do slug do produto pai, então só precisa desses campos)
export class CreateProdutoVariacaoDto {
  @IsString()
  @IsNotEmpty()
  DS_TAMANHO: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  QT_ESTOQUE: number;
}

// 2. O DTO Principal (Pai)
export class CreateProdutoDto {
  @IsString()
  @IsNotEmpty()
  NM_PRODUTO: string;

  @IsString()
  @IsNotEmpty()
  DS_SLUG: string;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  CD_CATEGORIA: number;

  @IsString()
  @IsNotEmpty()
  DS_DESCRICAO: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  VL_PRECO: number;

  // Chega como string JSON (multipart/form-data), então precisa ser parseado
  // antes das validações de array/nested rodarem.
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProdutoVariacaoDto)
  variacoes: CreateProdutoVariacaoDto[];

  @IsString()
  @IsIn(['S', 'N'])
  SN_PRINCIPAL: string;
}
