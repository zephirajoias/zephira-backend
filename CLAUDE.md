# Zephira — Backend (NestJS)

Loja de joias. API única (NestJS) que atende dois frontends Next.js
separados: o admin (`apps/admin`) e a loja pública (`apps/e-commerce`),
ambos no repositório `zephira-frontend` (pasta `apps/`).

Stack: NestJS 11, Prisma 6.12 (schema `Zephira` no Postgres), Supabase
(Postgres + Auth + Storage), Node 24.

> Este arquivo deve ser mantido atualizado. Sempre que um bug de
> arquitetura, uma instabilidade de infra ou uma convenção de dados for
> descoberta, registrar aqui — não deixar o conhecimento morrer no
> histórico da conversa.

## Onde as coisas ficam

- `src/modules/admin` — tudo que exige login de admin (produtos,
  categorias, pedidos, configurações, promoções, dashboard). Guard:
  `AdminJwtGuard`.
- `src/modules/loja` — endpoints do cliente logado (endereços, pedidos,
  perfil, frete, pagamento). Guard: `UserJwtGuard` (exceto frete/pagamento
  que são públicos).
- `src/modules/products` — catálogo público (sem guard). É daqui que a
  loja busca produto/categoria pra exibir.
- `src/modules/auth` — login/registro de cliente (não confundir com login
  de admin, que fica dentro de `admin/services/admin.service.ts`).

## Convenções de dados — ARMADILHA CONHECIDA

Todo campo booleano-como-string no banco usa **`'S'`/`'N'`**, nunca
`'1'`/`'0'` e nunca boolean de verdade. Isso já causou uma leva de bugs
reais (setembro/2026): `SN_PRINCIPAL` (imagem de capa do produto) foi
gravado/filtrado com `'1'`/`'0'` em pelo menos 5 lugares diferentes
(criação de produto, listagem pública, listagem do admin, dashboard
"produto mais vendido", definir capa) — cada um quebrado de um jeito
diferente (imagem sumia da listagem, dashboard voltava vazio, etc). Ao
escrever qualquer query nova envolvendo `SN_PRINCIPAL`, `SN_ATIVO` etc,
**sempre usar `'S'`/`'N'`** e desconfiar de qualquer `'1'`/`'0'` que
aparecer.

`CATEGORIA.DS_SLUG` **não é único globalmente** — só é único entre irmãs
(mesma `CD_CATEGORIA_PAI`). Ex: "aco" existe embaixo de Brinco, Colar,
Pulseira etc, todos com o mesmo slug. Qualquer busca por categoria via
slug tem que ser hierárquica (resolve o pai pelo slug de topo primeiro,
depois o filho dentro dele) — nunca um `WHERE DS_SLUG = ?` solto, senão
mistura produtos de categorias diferentes. Ver
`ProductsService.buscaCategoriaPorSlug`.

## Autenticação de admin — sistema duplo

Admins antigos têm senha em `USUARIO.DS_SENHA_HASH` (bcrypt). Ao logar
(ou pedir "esqueci senha"), o backend migra silenciosamente pro Supabase
Auth, salvando o id em `USUARIO.CD_AUTH_SUPABASE`. Depois disso, login
passa a validar via `supabase.auth.signInWithPassword`.

Se a migração criar o usuário no Supabase mas falhar/cair antes de salvar
`CD_AUTH_SUPABASE` localmente (ex: timeout de rede — já aconteceu de
verdade), o código busca o usuário existente no Supabase por e-mail
(`listUsers` + filtro, já que a API não tem "buscar por e-mail" direto) e
linka em vez de travar tentando recriar um usuário que já existe. Ver
`AdminService.buscarUsuarioSupabasePorEmail` / `ehErroDeEmailJaExistente`.
Se esse padrão de "conta órfã no Supabase" reaparecer em outro fluxo,
reusar essa lógica.

As chaves de assinatura do JWT (RS256) vêm de `JWT_PRIVATE_KEY` /
`JWT_PUBLIC_KEY` (ver `src/common/chaves-jwt.ts`). Os arquivos em `keys/`
são só a reserva do desenvolvimento local e não entram na imagem Docker
(`.dockerignore`). Token assinado com uma chave que não é a do servidor
volta 401.

## Estoque do pedido

O estoque sai quando o pedido é criado (PENDENTE) e volta quando ele vira
CANCELADO, seja pelo aviso (webhook) do Mercado Pago, seja pelo admin. Se
um pedido cancelado volta a ser pago (o Mercado Pago deixa o cliente
tentar de novo depois de um cartão recusado), as peças saem de novo.
DEVOLVIDO (reembolso) não devolve estoque sozinho. Toda troca de status
tem que passar por `acertarEstoqueDoPedido` (`src/common/estoque-pedido.ts`)
na mesma transação. O webhook ignora aviso de "recusado" ou "pendente"
chegando atrasado para um pedido que já está pago.

Pedido abandonado (o cliente nunca paga, não chega webhook) é cancelado
sozinho depois de 24h: ver "Pedido pendente".

## Cache do catálogo público

As 4 rotas de `/products` (`products.controller.ts`) respondem com
`Cache-Control: s-maxage=60, stale-while-revalidate=300` via
`respondeComCache`, pro Cloudflare de São Paulo guardar a resposta (a VPS
fica nos EUA, ida e volta ~0,45s). **Só funciona com uma Cache Rule no
Cloudflare** para `api.zephirajoias.com.br/products*` (o Cloudflare não
cacheia JSON por padrão). O CORS dessas respostas é fixo no endereço da
loja (`USER_FRONTEND_URL`) porque o cache não separa por `Origin`: sem
isso, uma resposta guardada a partir de um pedido do servidor (sem
Origin) faria o navegador da loja falhar por CORS. Consequência: essas
rotas não servem pra `localhost` apontando pra API de produção. Preço e
produto novo levam até ~1min pra aparecer; o checkout confere o estoque
direto no banco, então não é afetado. Nunca aplicar `respondeComCache` em
rota com dado por usuário.

## Erros da API

Todo erro passa pelo filtro global `src/common/filtro-erros.ts`. Controller
**não** devolve `res.status(409).send(err)` (era o padrão antigo, que vazava
detalhe do banco e fazia tudo parecer "conflito"): no `catch`, só `throw
err`. HttpException sai com o próprio status e corpo (os fronts leem
`message`), erro conhecido do Prisma vira 404/409 em português, e o resto
vira 500 genérico com o detalhe no log.

## Slug de produto e categoria

Gerado/limpo no backend (`src/common/slug.ts`), não confiar no que vem do
navegador. Produto: a partir do nome, único (`-2`, `-3`...). Categoria:
o admin digita, o backend só limpa (acento, espaço), porque o menu da loja
depende desses endereços.

## E-mails pro cliente

`src/common/email/email.service.ts`, via Resend (API HTTP, sem SDK).
Desligado enquanto `RESEND_API_KEY` não existir. Dispara em: pedido criado,
webhook marcando PAGO e compra da etiqueta (com o rastreio). Nunca lança
erro. O domínio do remetente (`EMAIL_REMETENTE`, padrão
`pedidos@zephirajoias.com.br`) precisa estar verificado no Resend: o DNS da
zephirajoias.com.br hoje declara que **não envia e-mail** (`v=spf1 -all`,
DMARC `p=reject`, MX nulo), então sem os registros do Resend tudo cai.

## Pedido pendente

`PedidosExpiradosService` cancela, a cada 30 min, pedido PENDENTE com mais
de 24h (devolve estoque). Ao criar pedido novo, os PENDENTES anteriores do
mesmo cliente são cancelados na hora: o carrinho da loja só esvazia depois
do pagamento, então quem desiste no Mercado Pago e finaliza de novo não
pode travar a própria peça. Webhook só marca PAGO se o valor pago cobre o
total.

## Upload de imagem (padrão usado em todo lugar)

Multer (`FilesInterceptor`/`FileInterceptor`) → `sharp` processa/otimiza
→ sobe pro bucket Supabase Storage `imagens-produtos` → salva a URL
pública no Postgres. Prefixos usados: `produtos/` (fotos de produto),
`config/` (logo/favicon da loja).

**Se um upload multipart do frontend chegar vazio/quebrado no backend**,
o primeiro suspeito é o frontend, não aqui — ver nota em
`apps/CLAUDE.md` sobre o axios não poder ter `Content-Type` fixo na
instância.

## Infra — instabilidades conhecidas (não é bug do seu código)

- **Render (free tier)**, em processo de ser desligado (ver "Deploy"):
  dorme depois de ~15min sem uso e o primeiro request pode levar 60-100s+.
  Qualquer frontend que chama a API precisa de timeout (não deixar a UI
  presa em "Carregando..." pra sempre) — ver `apps/CLAUDE.md`.
- **Conexão direta com o Postgres da Supabase** (`db.<ref>.supabase.co`)
  só responde por IPv6 e falha de forma intermitente com `Can't reach
  database server`. Em produção a API usa o **session pooler**
  (`aws-1-us-east-1.pooler.supabase.com:5432`, usuário `postgres.<ref>`),
  que responde por IPv4. O `.env` local ainda usa a conexão direta: se um
  comando com Prisma falhar assim aqui, tentar de novo ou trocar pro
  pooler. O banco fica em us-east-1 (EUA), então cada consulta vinda do
  Brasil custa ~120 ms de ida e volta.
- **SuperFrete `/calculator` exige o campo `services`** desde set/2026.
  Sem ele a API responde "Nenhum frete válido encontrado" e o carrinho fica
  sem opção de frete. Hoje o código manda `1,2,3,17,31` (PAC, SEDEX,
  Jadlog, Mini Envios, Loggi).
- `FRONTEND_URL` no `.env` tem `/` no final — qualquer código que
  concatena esse valor com um path (ex: link de recuperação de senha)
  precisa tirar a barra final primeiro (`.replace(/\/+$/, '')`), senão
  gera URL com barra dupla.

## Jeito de testar mudanças nesse repo

- `npx tsc -p tsconfig.build.json --noEmit` pra checar compilação sem
  rodar nada.
- Pra testar de verdade contra a API rodando local (`npx nest start`),
  dá pra gerar um JWT de admin válido sem precisar de senha real:
  ```js
  const jwt = require('./node_modules/.pnpm/jsonwebtoken@9.0.3/node_modules/jsonwebtoken');
  const privateKey = require('fs').readFileSync('keys/private.pem', 'utf8');
  jwt.sign({ sub: 1, roles: 'ADMIN', email: 'teste@zephira.com' }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
  ```
- Testes que criam dado (produto, categoria, usuário, upload) devem
  **sempre limpar depois** (deletar do Postgres E do Supabase Storage/Auth
  se for o caso) — esse banco é o de produção, não tem staging separado.
- `npx next build` roda contra `.env.local`; pra simular o comportamento
  do Vercel sem uma env var configurada, renomear o `.env.local`
  temporariamente antes do build (e devolver o nome depois).

## Variáveis de ambiente esperadas (`.env`)

`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_ANON_KEY`, `FRONTEND_URL`, `USER_FRONTEND_URL`, `BACKEND_URL`,
`MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_SANDBOX`, `SUPERFRETE_TOKEN`,
`SUPERFRETE_USER_AGENT` (+ `SUPERFRETE_REMETENTE_*`/`SUPERFRETE_PACOTE_*`
como fallback — o valor de verdade fica editável em Configurações Gerais
no admin, salvo em `CONFIGURACOES_LOJA`).

Só em produção: `NODE_ENV=production`, `PORT=3001`,
`TZ=America/Sao_Paulo`, `TRUST_PROXY_HOPS=2` (Cloudflare + nginx; sem
isso todo visitante aparece como 127.0.0.1 e o limite de 60 req/min vira
um contador único pra loja inteira), `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`
(PEM numa linha, com `\n` literal; lidas por `src/common/chaves-jwt.ts`,
que só cai nos arquivos de `keys/` quando a variável não existe).
Opcionais: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_CALLBACK_URL_ADMIN`, `GOOGLE_CALLBACK_URL_USER` (sem elas o login
com Google fica desligado e o resto sobe normal). `GIT_SHA` vem do deploy. E-mail: `RESEND_API_KEY` (sem ela, nenhum e-mail
sai) e `EMAIL_REMETENTE` (opcional). `CANCELAR_PEDIDOS_EXPIRADOS=false`
desliga o cancelamento automático de pendentes.

## Deploy (VPS da loja)

A VPS é da própria loja (Ubuntu 24.04, Docker + nginx + certbot). Ela
**também roda a stack de automação da loja** (n8n, Evolution API e um
Postgres, em `/root/automacao`, sites `n8n` e `evolution` no nginx). Não
mexer nessa stack nem nas portas dela (5678, 8080).

- Código em `/opt/zephira/back-end` (este repo) e `/opt/zephira/front-end`
  (repo `zephira-frontend`), clonados por HTTPS enquanto os repositórios
  forem públicos. Se virarem privados, a VPS precisa de uma deploy key por
  repositório (o GitHub não aceita a mesma chave em dois) e o `remote` de
  cada clone passa pra SSH.
- Containers: API em `127.0.0.1:3001`, loja em `:3000`, admin em `:3002`.
  Nada exposto direto; tudo passa pelo nginx.
- nginx: sites `zephira-api`, `zephira-loja` (sem www redireciona pra www)
  e `zephira-admin`, com HTTPS do **certbot/Let's Encrypt**, o mesmo
  esquema que o n8n já usa nesse servidor. `client_max_body_size 30m` na
  API por causa do upload de fotos.
- **Domínio novo: rodar o certbot logo depois de apontar o DNS.** O
  Cloudflare liga na porta 443 da VPS. Enquanto o nome não tem
  certificado, o nginx entrega o primeiro site com HTTPS que tiver, que é
  o do Evolution, e a página mostra "Welcome to the Evolution API". Isso
  aconteceu na troca de DNS de 2026-09-25. A ordem é: criar o site no
  nginx (porta 80), apontar o DNS e rodar
  `certbot --nginx -d <dominio> --non-interactive --redirect`.
  A renovação é automática (`certbot.timer`).
- O `.env` da API e o do front **existem só na VPS**. As chaves JWT de
  produção foram geradas lá e não saem de lá.
- O workflow `.github/workflows/deploy.yml` faz build + `docker build` em
  todo push. O deploy (SSH → `git pull` → `docker compose build` →
  `up -d --wait`) só roda com a variável de repositório `DEPLOY_ENABLED=true`
  e os secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`. Depois ele confere se
  `https://api.zephirajoias.com.br/health` mostra o commit novo.
- Deploy manual, na VPS:
  ```bash
  cd /opt/zephira/back-end && git pull --ff-only
  export GIT_SHA=$(git rev-parse HEAD)
  docker compose build && docker compose up -d --wait
  ```
- A imagem é Debian slim (não Alpine) porque bcrypt, sharp e o engine do
  Prisma têm binário pronto pra glibc. O build sai em `dist/src/main.js`
  (o `jest.config.ts` na raiz empurra tudo um nível pra baixo).

## Histórico de mudanças relevantes

- **2026-09-24** — Análise completa do projeto (backend, admin, loja).
- **2026-09-25** — API, loja e admin empacotados em Docker e publicados na
  VPS da loja, ao lado da stack de automação. Chaves JWT passam a vir do
  ambiente, com par novo gerado na VPS. Banco pelo session pooler.
  `/health` devolve o commit. Frete da SuperFrete voltou a funcionar
  (campo `services`).
- **2026-09-25** — DNS trocado: `www`, `admin` e `api` passam a responder
  pela VPS, com certificados do certbot. O domínio sem www ainda aponta
  pra Vercel, que redireciona pro www.
- **2026-09-25** — Listagem e "mais vendido" usam a primeira foto quando
  nenhuma está marcada como capa (40 produtos estavam assim). Cancelar
  pedido devolve o estoque.
- **2026-09-25** — Catálogo público com `Cache-Control` pro Cloudflare.
- **2026-09-26** — Filtro de erro global; e-mails de pedido (Resend,
  desligado até ter chave); pendente cancela em 24h e carrinho só esvazia
  depois do pagamento; webhook confere valor; busca por palavra (nome,
  slug e categoria); slug gerado no backend. Migração da fase 2 escrita em
  `prisma/sql/2026-09-26-melhorias.sql`, **ainda não aplicada**.
