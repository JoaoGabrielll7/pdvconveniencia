# Rodar tudo no Docker – Passo a passo

Banco de dados, backend e frontend em um comando.

---

## 1. Instalar o Docker

1. Baixe o **Docker Desktop**: https://www.docker.com/products/docker-desktop/
2. Instale e abra o programa.
3. Espere o Docker estar rodando (ícone na bandeja do Windows).
4. Se pedir para reiniciar o PC, reinicie.

---

## 2. Abrir o terminal na pasta do projeto

1. Abra a pasta do projeto no **Cursor** (onde está o `docker-compose.yml`).
2. Menu **Terminal** → **Novo Terminal** (ou `` Ctrl+` ``).
3. Confira se você está na pasta **pdv** (onde fica o `docker-compose.yml`).

Se não estiver, digite e pressione Enter:

```bash
cd C:\Users\João\Desktop\pdv
```

---

## 3. Subir tudo (banco, backend e frontend)

No terminal, digite e pressione **Enter**:

```bash
docker-compose up -d
```

**O que acontece:**

- **Primeira vez:** o Docker baixa o PostgreSQL e **constrói** o backend e o frontend (pode levar 3–5 minutos).
- **Próximas vezes:** sobe bem mais rápido.

**No final** deve aparecer algo como:

```text
Creating conveniencia_postgres ... done
Creating conveniencia_backend  ... done
Creating conveniencia_frontend ... done
```

---

## 4. Abrir o sistema no navegador

Abra o navegador e acesse:

**http://localhost**

- Aí está o **frontend** (tela de login e PDV).
- O **backend** (API) responde em segundo plano.
- Login: **admin@conveniencia.com** / **admin123**

---

## 5. Conferir se está rodando

No terminal:

```bash
docker ps
```

Devem aparecer **3 containers** com status **Up**:

- conveniencia_postgres (porta 5432)
- conveniencia_backend (porta 3000)
- conveniencia_frontend (porta 80)

---

## 6. Parar tudo

Quando quiser desligar, na pasta do projeto:

```bash
docker-compose down
```

Os dados do banco ficam guardados. Para usar de novo: `docker-compose up -d`.

---

## Resumo

| O que fazer           | Comando               |
|-----------------------|------------------------|
| Subir tudo            | `docker-compose up -d` |
| Ver containers        | `docker ps`           |
| Parar tudo            | `docker-compose down`  |
| Abrir o sistema       | http://localhost      |

Sempre use esses comandos na pasta onde está o **docker-compose.yml**.

---

## Se der erro

- **Docker não encontrado:** confira se o Docker Desktop está aberto e rodando.
- **Porta em uso:** se algo já usa a porta 80, 3000 ou 5432, pare esse programa ou mude a porta no `docker-compose.yml`.
- **Build falhou:** rode de novo `docker-compose up -d`. Se continuar, abra o terminal e cole a mensagem de erro para alguém analisar.

---

## Login não funciona

Se ao tentar fazer login aparecer "E-mail ou senha inválidos" ou der erro:

1. **Criar o usuário manualmente** – no terminal (na pasta do projeto), rode:

   ```bash
   docker exec conveniencia_backend npx tsx prisma/seed.ts
   ```

   Isso cria o usuário **admin@conveniencia.com** com senha **admin123**.

2. **Confirmar que o backend está no ar** – abra no navegador:  
   **http://localhost/api/health**  
   Deve aparecer algo como: `{"success":true,"message":"API Conveniência OK"}`.  
   Se não aparecer, o backend pode não estar rodando.

3. **Ver os logs do backend** – no terminal:

   ```bash
   docker logs conveniencia_backend
   ```

   Assim você vê se houve algum erro ao subir o backend ou ao rodar o seed.
