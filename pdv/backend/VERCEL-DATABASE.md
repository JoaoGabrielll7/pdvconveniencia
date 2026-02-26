# Conectar o banco de dados no Vercel

O backend usa **Prisma** com **PostgreSQL**. Para rodar na Vercel, use um Postgres em nuvem (recomendado: **Neon**) e configure as variáveis de ambiente no projeto.

## 1. Adicionar Postgres pelo Marketplace da Vercel

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard) e abra seu projeto.
2. Vá em **Storage** (ou **Integrations** / Marketplace).
3. Procure por **Neon** (ou outro Postgres) e clique em **Add** / **Connect**.
4. Siga o assistente: crie um banco Neon (ou vincule um existente).
5. A integração vai **injetar variáveis** no projeto. Geralmente aparecem como:
   - `POSTGRES_URL` ou `DATABASE_URL` (conexão pooled)
   - `POSTGRES_URL_NON_POOLING` ou similar (conexão direta)

## 2. Variáveis de ambiente no projeto Vercel

No projeto, em **Settings → Environment Variables**, garanta:

| Variável        | Uso |
|-----------------|-----|
| `DATABASE_URL`  | URL **pooled** (com `-pooler` no host). Usada pela aplicação em produção. |
| `DIRECT_URL`    | URL **direta** (sem pooler). Usada pelo Prisma em `migrate` / `db push`. |

- Se a integração Neon criar só `POSTGRES_URL` e `POSTGRES_URL_NON_POOLING`, defina:
  - `DATABASE_URL` = valor de `POSTGRES_URL` (pooled)
  - `DIRECT_URL` = valor de `POSTGRES_URL_NON_POOLING` (direta)

Defina também as demais variáveis do backend (veja `.env.example`), por exemplo:

- `NODE_ENV=production`
- `CORS_ORIGIN` = URL do front (ex: `https://seu-app.vercel.app`)
- `JWT_SECRET` (chave forte em produção)
- `PORT` (a Vercel define automaticamente; pode omitir se quiser)

## 3. Rodar migrações no banco da Vercel

Com `DATABASE_URL` e `DIRECT_URL` apontando para o banco Neon (ou outro Postgres):

```bash
cd pdv/backend
npx prisma migrate deploy
```

Ou, se estiver usando apenas `db push` (sem histórico de migrações):

```bash
npx prisma db push
```

Para popular dados iniciais (opcional):

```bash
npx prisma db seed
```

## 4. Conferir o deploy

- O `build` do backend já roda `prisma generate`.
- O `postinstall` também roda `prisma generate` para garantir o client no deploy.
- Em produção, a aplicação usa apenas `DATABASE_URL`; o Prisma usa `DIRECT_URL` só em comandos de migração.

## Resumo

1. Conectar **Neon** (ou outro Postgres) ao projeto no Vercel.
2. Configurar **DATABASE_URL** (pooled) e **DIRECT_URL** (direta) nas env vars do projeto.
3. Rodar **prisma migrate deploy** (ou **db push**) uma vez contra esse banco.
4. Fazer deploy; o backend usará o banco configurado nas variáveis.
