# ── Stage 1: build ────────────────────────────────────────────────────────────
# Debian (slim) em vez de Alpine: bcrypt, sharp e o engine do Prisma têm
# binário pronto pra glibc; no Alpine (musl) qualquer um deles pode exigir
# compilar do zero.
FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@10.26.0

# O postinstall roda `prisma generate`, então o schema precisa estar aqui
# antes do install.
COPY package.json pnpm-lock.yaml .npmrc ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ── Stage 2: produção ─────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates tzdata \
  && rm -rf /var/lib/apt/lists/*

# node_modules inteiro do builder: o pnpm gera o client do Prisma dentro de
# node_modules/.pnpm, e copiar só @prisma/client quebra os symlinks.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3001

# O build sai em dist/src/main.js (o jest.config.ts na raiz entra na
# compilação e empurra tudo um nível pra baixo).
CMD ["node", "dist/src/main"]
