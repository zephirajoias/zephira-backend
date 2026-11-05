-- Imagens da home editáveis pelo admin (banner do topo, as 2 fotos de
-- "Combinações Perfeitas") e texto do rodapé — antes fixos no código do
-- e-commerce. Sem valor (NULL) a loja continua mostrando o texto/foto de
-- reserva embutida no front, igual às páginas institucionais.
-- Rodar com:
--   npx prisma db execute --file prisma/sql/2026-11-05-home-editavel.sql --schema prisma/schema.prisma

BEGIN;

ALTER TABLE "Zephira"."CONFIGURACOES_LOJA"
  ADD COLUMN IF NOT EXISTS "DS_URL_BANNER_HOME" TEXT,
  ADD COLUMN IF NOT EXISTS "DS_URL_FOTO_COMBINACAO_1" TEXT,
  ADD COLUMN IF NOT EXISTS "DS_URL_FOTO_COMBINACAO_2" TEXT,
  ADD COLUMN IF NOT EXISTS "DS_TEXTO_RODAPE" VARCHAR(300);

COMMIT;
