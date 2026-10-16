-- Foto por variação (cor/tamanho): cada cor de uma peça pode ter a própria
-- foto, em vez de dividir "as mesmas" fotos entre cores diferentes. Só
-- acrescenta uma coluna nula: não apaga nem altera nenhuma foto existente.
-- Rodar com:
--   npx prisma db execute --file prisma/sql/2026-10-16-foto-por-variacao.sql --schema prisma/schema.prisma

BEGIN;

ALTER TABLE "Zephira"."IMAGENS_PRODUTO"
  ADD COLUMN IF NOT EXISTS "CD_VARIACAO" INTEGER
    REFERENCES "Zephira"."VARIACOES_PRODUTO" ("CD_VARIACAO") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_imagens_variacao"
  ON "Zephira"."IMAGENS_PRODUTO" ("CD_VARIACAO");

COMMIT;
