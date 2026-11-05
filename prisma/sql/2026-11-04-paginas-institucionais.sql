-- Páginas institucionais editáveis pelo admin (Sobre, Garantia, Trocas,
-- FAQ, Como Comprar, Fale Conosco). Cria a tabela e semeia com o texto que
-- já está publicado hoje, pra ninguém ver a página mudar/sumir no deploy —
-- a partir daí, a loja edita pelo admin.
-- Rodar com:
--   npx prisma db execute --file prisma/sql/2026-11-04-paginas-institucionais.sql --schema prisma/schema.prisma

BEGIN;

CREATE TABLE IF NOT EXISTS "Zephira"."PAGINA_INSTITUCIONAL" (
  "DS_SLUG"        VARCHAR(30) PRIMARY KEY,
  "NM_TITULO"       VARCHAR(150) NOT NULL,
  "DS_CONTEUDO"     TEXT NOT NULL,
  "TS_ATUALIZACAO"  TIMESTAMPTZ(6) DEFAULT now()
);

INSERT INTO "Zephira"."PAGINA_INSTITUCIONAL" ("DS_SLUG", "NM_TITULO", "DS_CONTEUDO") VALUES
('sobre', 'Sobre a Zephira', 'A Zephira Joias é uma loja online de joias em prata 925, peças banhadas a ouro e aço inox: brincos, anéis, colares, pulseiras e conjuntos para usar no dia a dia e em ocasiões especiais.

Todas as peças têm garantia de 1 ano contra defeitos de fabricação e são enviadas para todo o Brasil, com o prazo e o preço do frete mostrados antes de você pagar.

[Conheça as novidades](/#novidades) ou [fale com a gente](/contato).'),

('como-comprar', 'Como comprar', '- **Escolha a peça.** Na página do produto, selecione o tamanho (quando houver) e toque em adicionar ao carrinho.
- **Calcule o frete.** No carrinho, informe o seu CEP para ver as opções de entrega, com preço e prazo de cada uma.
- **Entre na sua conta.** Se ainda não tiver cadastro, ele leva menos de um minuto. É por ela que você acompanha o pedido.
- **Escolha o endereço e pague.** O pagamento é feito no ambiente seguro do Mercado Pago, por Pix ou cartão de crédito.
- **Acompanhe.** Em Minha conta você vê o status do pedido e, depois do envio, o código de rastreio.

## Pagamento
O Pix é aprovado na hora. No cartão, o valor pode ser parcelado; as parcelas disponíveis aparecem na tela de pagamento do Mercado Pago. Pedidos não pagos em 24 horas são cancelados automaticamente e as peças voltam para a loja.'),

('trocas', 'Trocas e devoluções', '## Desistência em até 7 dias
Toda compra feita pela internet pode ser cancelada em até **7 dias corridos a partir do recebimento**, sem precisar de justificativa (Código de Defesa do Consumidor, art. 49). Devolvemos o valor total pago, incluindo o frete, pela mesma forma de pagamento usada na compra.

## Troca por defeito
Se a peça chegar com defeito ou apresentar defeito de fabricação dentro do prazo de garantia, fazemos a troca por outra igual ou, se não houver no estoque, devolvemos o valor. Veja a página de [garantia](/garantia) para saber o que ela cobre.

## Como pedir
- Fale com a gente por um dos contatos abaixo e informe o número do pedido (está em Minha conta).
- Enviamos as instruções e o código de postagem para devolver a peça.
- A peça deve voltar na embalagem original, sem sinais de uso.
- Assim que a peça chegar e for conferida, fazemos a troca ou o reembolso.'),

('garantia', 'Garantia', 'Todas as peças têm **garantia de 1 ano contra defeitos de fabricação**, contada a partir do recebimento. Esse prazo já inclui a garantia legal de 90 dias do Código de Defesa do Consumidor.

## O que a garantia cobre
- Fechos, argolas e engates que se soltam ou quebram com o uso normal.
- Soldas que se abrem.
- Pedras que se soltam sem ter havido impacto.

## O que ela não cobre
- Danos por queda, impacto, puxão ou peça amassada.
- Desgaste do banho causado por contato com perfume, cremes, cloro, água do mar ou produtos de limpeza.
- Peças consertadas ou alteradas por terceiros.
- Perda de peças ou pedras.

## Como cuidar
Coloque as joias depois de passar perfume e cremes, tire antes de dormir, tomar banho ou nadar, e guarde cada peça separada, num saquinho ou caixinha, longe da umidade. A prata 925 pode escurecer com o tempo; isso é natural do metal e sai com flanela própria para prata.

## Como acionar
Fale com a gente pelos contatos abaixo com o número do pedido e fotos da peça. A troca segue os mesmos passos da página de [trocas e devoluções](/trocas).'),

('faq', 'Perguntas frequentes', '[{"p":"Qual o prazo de entrega?","r":"Depende da forma de envio e do seu CEP. No carrinho, ao informar o CEP, cada opção de frete mostra o preço e o prazo em dias úteis. O prazo começa a contar depois da confirmação do pagamento."},{"p":"Como acompanho meu pedido?","r":"Em Minha conta, na aba de pedidos. Depois que o pedido é enviado, o código de rastreio aparece ali."},{"p":"Quais as formas de pagamento?","r":"Pix e cartão de crédito, pelo Mercado Pago. O Pix é aprovado na hora."},{"p":"A prata 925 escurece?","r":"Pode escurecer com o tempo, principalmente em contato com umidade e produtos químicos. É natural do metal e sai com uma flanela própria para prata. Veja os cuidados na página de garantia."},{"p":"Posso trocar ou devolver?","r":"Sim. Você pode desistir da compra em até 7 dias depois de receber, e peças com defeito de fabricação têm garantia de 1 ano. Os detalhes estão na página de trocas e devoluções."},{"p":"O que acontece se eu não pagar o pedido?","r":"Pedidos não pagos em 24 horas são cancelados automaticamente. Você pode fazer um novo pedido quando quiser."}]'),

('contato', 'Fale conosco', 'Dúvidas sobre uma peça, um pedido, troca ou garantia? Fale com a gente por um dos canais abaixo. Se for sobre um pedido, tenha o número dele em mãos (está em Minha conta).')

ON CONFLICT ("DS_SLUG") DO NOTHING;

COMMIT;
