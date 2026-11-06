-- Brinde (caixinha de joia) a partir de um valor mínimo no carrinho —
-- pedido da Thaís em 2026-11-05. Mesmo padrão do VL_FRETE_GRATIS_MINIMO:
-- vazio/0 desliga o aviso (ver CarrinhoPage no e-commerce).
-- Rodar com:
--   npx prisma db execute --file prisma/sql/2026-11-05-brinde-minimo.sql --schema prisma/schema.prisma

BEGIN;

ALTER TABLE "Zephira"."CONFIGURACOES_LOJA"
  ADD COLUMN IF NOT EXISTS "VL_BRINDE_MINIMO" DECIMAL(12, 2);

COMMIT;
