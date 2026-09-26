-- Migração da fase 2 das melhorias (2026-09-26). Só acrescenta: nenhuma
-- coluna ou tabela é apagada. Tudo numa transação: se qualquer passo falhar,
-- nada muda. Rodar com:
--   npx prisma db execute --file prisma/sql/2026-09-26-melhorias.sql --schema prisma/schema.prisma
-- e depois atualizar o schema.prisma (os campos já estão lá na branch da fase 2).

BEGIN;

-- Configurações Gerais: frete grátis, parcelas e dados da empresa
-- (Decreto 7.962/2013 pede razão social, CNPJ e endereço na loja online).
ALTER TABLE "Zephira"."CONFIGURACOES_LOJA"
  ADD COLUMN IF NOT EXISTS "VL_FRETE_GRATIS_MINIMO" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "NR_PARCELAS_SEM_JUROS" INTEGER,
  ADD COLUMN IF NOT EXISTS "NM_RAZAO_SOCIAL" VARCHAR(150),
  ADD COLUMN IF NOT EXISTS "NR_CNPJ" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "DS_ENDERECO_LOJA" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "DS_INSTAGRAM" VARCHAR(100);

UPDATE "Zephira"."CONFIGURACOES_LOJA"
   SET "VL_FRETE_GRATIS_MINIMO" = COALESCE("VL_FRETE_GRATIS_MINIMO", 199),
       "NR_PARCELAS_SEM_JUROS"  = COALESCE("NR_PARCELAS_SEM_JUROS", 3);

-- Preço por tamanho (vazio = usa o preço do produto).
ALTER TABLE "Zephira"."VARIACOES_PRODUTO"
  ADD COLUMN IF NOT EXISTS "VL_PRECO" DECIMAL(12,2);

-- Newsletter do rodapé.
CREATE TABLE IF NOT EXISTS "Zephira"."NEWSLETTER" (
  "CD_INSCRICAO" SERIAL PRIMARY KEY,
  "DS_EMAIL"     VARCHAR(255) NOT NULL,
  "TS_CRIACAO"   TIMESTAMPTZ(6) DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "NEWSLETTER_DS_EMAIL_key"
  ON "Zephira"."NEWSLETTER" ("DS_EMAIL");

-- Capa da foto: padrão da coluna era '0' (fora da convenção 'S'/'N').
ALTER TABLE "Zephira"."IMAGENS_PRODUTO" ALTER COLUMN "SN_PRINCIPAL" SET DEFAULT 'N';
UPDATE "Zephira"."IMAGENS_PRODUTO" SET "SN_PRINCIPAL" = 'N'
 WHERE "SN_PRINCIPAL" NOT IN ('S', 'N');
-- Produto sem nenhuma foto marcada como capa: a primeira vira capa.
UPDATE "Zephira"."IMAGENS_PRODUTO" SET "SN_PRINCIPAL" = 'S'
 WHERE "CD_IMAGEM" IN (
   SELECT DISTINCT ON (i."CD_PRODUTO") i."CD_IMAGEM"
     FROM "Zephira"."IMAGENS_PRODUTO" i
    WHERE NOT EXISTS (
      SELECT 1 FROM "Zephira"."IMAGENS_PRODUTO" j
       WHERE j."CD_PRODUTO" = i."CD_PRODUTO" AND j."SN_PRINCIPAL" = 'S')
    ORDER BY i."CD_PRODUTO", i."NR_ORDEM" NULLS LAST, i."CD_IMAGEM");

-- Endereço de produto repetido: a peça mais nova ganha "-2", "-3"...
-- e depois o banco passa a recusar repetição.
UPDATE "Zephira"."PRODUTOS" p
   SET "DS_SLUG" = p."DS_SLUG" || '-' || d.n
  FROM (
    SELECT "CD_PRODUTO",
           ROW_NUMBER() OVER (PARTITION BY "DS_SLUG" ORDER BY "CD_PRODUTO") AS n
      FROM "Zephira"."PRODUTOS"
  ) d
 WHERE d."CD_PRODUTO" = p."CD_PRODUTO" AND d.n > 1;
CREATE UNIQUE INDEX IF NOT EXISTS "PRODUTOS_DS_SLUG_key"
  ON "Zephira"."PRODUTOS" ("DS_SLUG");

COMMIT;
