# PDV Conveniencia
Sistema de ponto de venda com frontend React e backend Node/Express com PostgreSQL.

## Resumo
Este README descreve arquitetura, execução, endpoints, funcionalidades atuais e lacunas identificadas na revisão técnica.

## Arquitetura
O projeto é dividido em duas aplicações que se comunicam por API REST.

- `backend/`: API com autenticação, caixa, vendas, produtos, usuários, fornecedores e rotinas de sistema.
- `vite-project/`: interface web (admin e caixa) com fluxo de venda, caixa e gestão operacional.

## Stack
Estas são as tecnologias principais usadas no sistema.

- Frontend: React 19, TypeScript, Vite, FontAwesome.
- Backend: Node.js, Express, TypeScript, Prisma, Zod, JWT, bcryptjs.
- Banco: PostgreSQL.
- Infra opcional: Docker Compose com Nginx + Backend + Postgres.

## Estrutura
Esta é a estrutura principal de pastas do repositório.

```txt
pdv/
  backend/
    prisma/
      schema.prisma
      seed.ts
    src/
      app.ts
      server.ts
      modules/
      routes/
      services/
      controllers/
  vite-project/
    src/
      App.tsx
      App.css
      index.css
```

## Requisitos
Estas dependências são necessárias para rodar o projeto localmente.

- Node.js 20+
- npm 10+
- PostgreSQL 15+ (se não usar Docker)

## Variáveis de Ambiente
Estas variáveis controlam portas, banco, segurança e limites do backend.

Arquivo: `pdv/backend/.env`

```env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://conveniencia_user:conveniencia_pass@localhost:5432/conveniencia_db"
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=troque-esta-chave
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=7
LOGIN_MAX_ATTEMPTS=5
LOGIN_BLOCK_MINUTES=15
SESSION_INACTIVITY_MINUTES=30
PASSWORD_RESET_TOKEN_TTL_MINUTES=30
COOKIE_SECURE=false
GLOBAL_RATE_LIMIT_PER_MINUTE=180
CACHE_TTL_SECONDS=30
BACKUP_DIR=./storage/backups
SEED_ADMIN_PASSWORD=admin123
SEED_CAIXA_PASSWORD=caixa123
```

## Rodar em Docker
Este modo sobe Postgres, backend e frontend em containers.

No diretório raiz:

```bash
docker compose up -d --build
```

Portas padrão no Docker:

- Frontend: `http://localhost`
- Backend API: `http://localhost:3000/api`
- Postgres: `localhost:5432`

## Rodar Local (sem Docker)
Este modo roda backend e frontend pelo Node/Vite.

### Backend

```bash
cd pdv/backend
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Health check:

- `http://localhost:3001/api/health`

### Frontend

```bash
cd pdv/vite-project
npm install
npm run dev
```

Proxy do Vite:

- Arquivo: `pdv/vite-project/vite.config.ts`
- Padrão atual: `http://127.0.0.1:3000`
- Para backend local em `3001`, use:

```bash
# PowerShell
$env:VITE_PROXY_TARGET="http://127.0.0.1:3001"
npm run dev
```

## Scripts
Estes são os comandos principais para build, execução e banco.

### Backend (`pdv/backend/package.json`)

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run db:generate`
- `npm run db:push`
- `npm run db:migrate`
- `npm run db:studio`
- `npm run db:seed`

### Frontend (`pdv/vite-project/package.json`)

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

## Credenciais Seed
Estas contas são criadas no seed para acesso inicial.

- Admin: `admin@conveniencia.com`
- Caixa: `caixa@conveniencia.com`
- Senhas: `SEED_ADMIN_PASSWORD` e `SEED_CAIXA_PASSWORD`

## Perfis e Permissões
Estas regras definem o que cada perfil pode acessar no sistema.

- `ADMIN`: acesso completo, incluindo usuários/fornecedores, limpeza de histórico e funções de sistema.
- `CAIXA`: operação de venda e caixa com acesso limitado.

## Endpoints
Lista resumida dos endpoints disponíveis atualmente na API.

Base URL:

- Docker: `http://localhost:3000/api`
- Local: `http://localhost:3001/api`

### Health

- `GET /health`

### Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`
- `PATCH /auth/me`
- `PATCH /auth/me/password`
- `POST /auth/logout`

### Produtos

- `GET /produtos`
- `GET /produtos/:id`
- `POST /produtos` (`ADMIN`)
- `PATCH /produtos/:id` (`ADMIN`)
- `DELETE /produtos/:id` (`ADMIN`)

### Categorias

- `GET /categorias`
- `GET /categorias/:id`
- `POST /categorias` (`ADMIN`)
- `PATCH /categorias/:id` (`ADMIN`)
- `DELETE /categorias/:id` (`ADMIN`)

### Usuários

- `GET /usuarios` (`ADMIN`)
- `GET /usuarios/:id` (`ADMIN`)
- `POST /usuarios` (`ADMIN`)
- `PATCH /usuarios/:id` (`ADMIN`)
- `DELETE /usuarios/:id` (`ADMIN`)

### Fornecedores

- `GET /fornecedores` (`ADMIN`)
- `GET /fornecedores/:id` (`ADMIN`)
- `POST /fornecedores` (`ADMIN`)
- `PATCH /fornecedores/:id` (`ADMIN`)
- `DELETE /fornecedores/:id` (`ADMIN`)

### Vendas

- `GET /vendas`
- `GET /vendas/:id`
- `POST /vendas`
- `DELETE /vendas/historico` (`ADMIN`)

### Caixa

- `GET /caixas/ativo`
- `GET /caixas/historico`
- `GET /caixas/indicadores`
- `POST /caixas/abrir`
- `POST /caixas/sangria`
- `POST /caixas/suprimento`
- `POST /caixas/fechar`
- `DELETE /caixas/historico` (`ADMIN`)

### Sistema

- `GET /system/licenses`
- `POST /system/licenses/renew`
- `GET /system/logs/today`
- `POST /system/backup/create`
- `GET /system/backup/files`
- `POST /system/cache/clear`
- `GET /system/security/check`

## Funcionalidades Implementadas
Estas funcionalidades foram validadas no fluxo atual da aplicação.

- Login com JWT e refresh cookie.
- Controle por perfil (`ADMIN`/`CAIXA`).
- CRUD de produtos persistido no banco.
- CRUD de usuários persistido no banco (somente admin).
- CRUD de fornecedores persistido no banco (somente admin).
- Venda com baixa de estoque.
- Gestão de caixa (abertura, sangria, suprimento, fechamento).
- Limpeza de histórico protegida por admin.
- Backup local no frontend e backup de snapshot no backend.
- Modal customizado para confirmações críticas (exclusões, logout, limpeza).
- Alteração de senha na conta usando endpoint backend (`/auth/me/password`).

## Lacunas Encontradas na Revisão
Estas são funcionalidades ainda pendentes ou parciais após a verificação do sistema.

1. Clientes ainda são salvos localmente (`localStorage`) no frontend e não possuem módulo/API no backend.
2. Restauração de backup do servidor ainda não existe como endpoint (há criação e listagem de arquivos).
3. Impressão em maquininha térmica física ainda não está integrada (o sistema usa impressão web).
4. Não há suíte de testes automatizados (unitários/integrados/e2e) no repositório.

## Troubleshooting
Esta seção cobre os erros mais frequentes de integração frontend/backend.

### `Resposta HTML recebida da API`

- Causa comum: proxy `/api` apontando para porta errada.
- Ajuste `vite.config.ts` ou `VITE_PROXY_TARGET`.
- Confirme backend em execução e rota `GET /api/health`.

### `Failed to fetch`

- Causa comum: backend offline, CORS ou proxy quebrado.
- Verifique se backend está rodando na porta esperada.
- Reinicie frontend após mudar `vite.config.ts`.

### `Dados inválidos` ao listar usuários/fornecedores

- O backend limita `limit` em paginação para no máximo `100`.
- O frontend já foi ajustado para respeitar esse limite.

### `ECONNREFUSED` no Vite

- Backend não está disponível na porta do proxy.
- Em Docker: normalmente `3000`.
- Em local: normalmente `3001`.

## Comentários no Código
Os comentários de seção foram revisados para refletir o comportamento real, incluindo o ponto de que clientes ainda são locais e usuários/fornecedores já usam API.

## Licença
Projeto sem licença pública definida no repositório.

## Atualizacao Licencas SaaS
Modulo novo de licencas implementado com validacao online, auditoria e controle de dispositivos.

### Endpoints de Licenca
- `POST /licenses/validate` (com rate limit dedicado)
- `GET /licenses/current` (autenticado)
- `POST /licenses` (`ADMIN`/`SUPORTE`)
- `GET /licenses` (`ADMIN`/`SUPORTE`)
- `GET /licenses/:id` (`ADMIN`/`SUPORTE`)
- `PATCH /licenses/:id/block` (`ADMIN`/`SUPORTE`)
- `PATCH /licenses/:id/activate` (`ADMIN`/`SUPORTE`)
- `PATCH /licenses/:id/expire` (`ADMIN`/`SUPORTE`)
- `PATCH /licenses/:id/add-days` (`ADMIN`/`SUPORTE`)
- `PATCH /licenses/:id/plan` (`ADMIN`/`SUPORTE`)
- `DELETE /licenses/:id` (`ADMIN`/`SUPORTE`)
- `GET /licenses/:id/history` (`ADMIN`/`SUPORTE`)
- `GET /licenses/:id/activations` (`ADMIN`/`SUPORTE`)

### Regras Implementadas
- Chave no padrao `LIC-XXXX-XXXX-XXXX`.
- Hash SHA256 para `deviceId`.
- Token JWT assinado no retorno de validacao.
- Expiracao automatica diaria por `node-cron`.
- Bloqueio do uso no frontend quando a validacao falhar.
- Cache local de validacao por 24h para contingencia offline.
