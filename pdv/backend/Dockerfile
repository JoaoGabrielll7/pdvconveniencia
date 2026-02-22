# Backend - Node.js + Prisma
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Dependências
COPY package.json package-lock.json* ./
RUN npm install

# Prisma
COPY prisma ./prisma/
RUN npx prisma generate

# Código e build
COPY . .
RUN npm run build

# Ao subir: cria tabelas, roda seed e inicia o servidor
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx prisma/seed.ts 2>&1 || true && node dist/server.js"]
