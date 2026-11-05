-- Carrossel de banners do topo (cada foto com link próprio, opcional), as
-- 2 fotos de "Combinações Perfeitas" e texto do rodapé — antes fixos no
-- código do e-commerce. Sem valor (NULL) a loja continua mostrando o
-- texto/foto de reserva embutida no front, igual às páginas institucionais.
-- DS_BANNERS_HOME guarda um JSON `[{"url","link"}, ...]`.
-- Rodar com:
--   npx prisma db execute --file prisma/sql/2026-11-05-home-editavel.sql --schema prisma/schema.prisma

BEGIN;

ALTER TABLE "Zephira"."CONFIGURACOES_LOJA"
  ADD COLUMN IF NOT EXISTS "DS_BANNERS_HOME" TEXT,
  ADD COLUMN IF NOT EXISTS "DS_URL_FOTO_COMBINACAO_1" TEXT,
  ADD COLUMN IF NOT EXISTS "DS_URL_FOTO_COMBINACAO_2" TEXT,
  ADD COLUMN IF NOT EXISTS "DS_TEXTO_RODAPE" VARCHAR(300);

COMMIT;
