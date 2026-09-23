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

As chaves de assinatura do JWT (RS256) vêm de arquivo:
`keys/private.pem` / `keys/public.pem` (commitados no repo, não são
segredo — trocar se algum dia isso incomodar). As variáveis de ambiente
`JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` no `.env` **não são usadas** por esse
fluxo (existem só pra outra coisa/ficaram órfãs — checar antes de
assumir que mexer nelas afeta o login).

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

- **Render (free tier)**: o backend "dorme" depois de ~15min sem uso e o
  primeiro request depois disso pode levar 60-100s+ pra responder. Isso
  já confundiu gente achando que a aplicação tinha travado. Qualquer
  frontend que chama a API precisa de timeout (não deixar a UI presa em
  "Carregando..." pra sempre) — ver `apps/CLAUDE.md`.
- **Conexão direta com o Postgres (porta 5432) da Supabase**: intermitente
  nesse ambiente de dev — falha com `Can't reach database server` do
  nada e volta a funcionar numa tentativa seguinte, sem mudar nada. A
  API HTTP da Supabase (Auth, Storage, PostgREST) não tem esse problema,
  só a conexão direta via Prisma. Se um comando com Prisma falhar assim,
  **tentar de novo antes de investigar mais fundo**.
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
