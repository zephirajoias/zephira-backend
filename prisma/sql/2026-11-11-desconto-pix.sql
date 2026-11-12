-- % de desconto no Pix, só informativo (exibido na loja junto do preço,
-- ao lado de "Nx sem juros") — não muda preço real nem pagamento.
-- Vazio/0 desliga a linha. Mesmo padrão do VL_FRETE_GRATIS_MINIMO/
-- VL_BRINDE_MINIMO. Rodar com:
--   npx prisma db execute --file prisma/sql/2026-11-11-desconto-pix.sql --schema prisma/schema.prisma

BEGIN;

ALTER TABLE "Zephira"."CONFIGURACOES_LOJA"
  ADD COLUMN IF NOT EXISTS "VL_DESCONTO_PIX_PERCENTUAL" DECIMAL(5, 2);

COMMIT;
