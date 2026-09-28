# Ducktix

Aplicação web de gestão de eventos, venda de ingressos, participantes,
check-in e relatórios. Projeto da disciplina de Banco de Dados II — UDESC,
Fase 1 (banco relacional PostgreSQL).

- Repositório: <https://github.com/uBrunoow/ducktix>
- Versão publicada: <https://ducktix.vercel.app>
- Documento da entrega (introdução, esquema conceitual e dicionário de dados):
  [`ENTREGA.md`](ENTREGA.md)

## Onde está cada item da entrega

| Item 2 do enunciado | Onde está |
|---|---|
| (a) Código-fonte da aplicação | [`ducktix/src/`](ducktix/src) |
| (b) Backup do banco de dados | [`ducktix/db/backup.sql`](ducktix/db/backup.sql) — `pg_dump` em texto puro, sem compactação |
| (c) Instruções de compilação e execução | este arquivo |

Nenhum arquivo do repositório está compactado.

Estrutura do repositório:

```text
README.md        este arquivo (instruções)
ENTREGA.md       documento da entrega (item 1)
ducktix/         a aplicação
  src/           código-fonte (Next.js + TypeScript)
  db/            schema.sql, seed.sql e backup.sql
  drizzle/       migrations do banco
  docs/          documentação técnica e diagramas
```

---

## 1. O que precisa estar instalado

| Ferramenta | Versão | Para quê | Como conferir |
|---|---|---|---|
| **Git** | qualquer recente | baixar o repositório | `git --version` |
| **Node.js** | **20 ou mais novo** (testado no 24) | compilar e executar a aplicação | `node --version` |
| **pnpm** | 10 ou mais novo | instalar as dependências | `pnpm --version` |
| **Docker** com **Docker Compose** | Docker 24+ / Compose v2 | rodar o PostgreSQL 16 sem instalá-lo | `docker --version` e `docker compose version` |

Não é preciso instalar o PostgreSQL: o Docker baixa e roda o PostgreSQL 16.
Se você preferir não usar Docker, veja a
[seção 5](#5-alternativa-sem-docker-postgresql-instalado-no-computador).

Se algum comando da coluna "Como conferir" responder *command not found* (ou
"não é reconhecido como comando"), instale a ferramenta seguindo o
[guia de instalação](#6-guia-de-instalação-das-ferramentas) no fim deste arquivo.

---

## 2. Passo a passo para executar

Os comandos funcionam no Linux, no macOS e no Windows (PowerShell ou Git Bash).
Onde o Windows é diferente, está indicado.

### 2.1 Baixar o código

```bash
git clone https://github.com/uBrunoow/ducktix.git
cd ducktix/ducktix
```

A pasta `ducktix/ducktix` é a da aplicação. **Todos os comandos seguintes
são executados dentro dela.**

### 2.2 Subir o banco de dados

Abra o Docker Desktop (Windows/macOS) e espere ele indicar que está rodando.
Depois:

```bash
docker compose up -d postgres
```

Isso cria um PostgreSQL 16 acessível em `localhost:5433` (usuário, senha e
banco: `ducktix`). A porta é 5433, não a padrão 5432, para não colidir com um
PostgreSQL que já exista no computador.

Espere uns 10 segundos e confira se ele está pronto:

```bash
docker compose ps
```

A coluna `STATUS` deve mostrar `healthy`.

### 2.3 Restaurar o backup (banco com dados)

Escolha **uma** das duas opções. O banco precisa estar vazio: se já restaurou
antes, recomece com `docker compose down -v` e `docker compose up -d postgres`.

#### Opção A — por comando

```bash
docker compose cp db/backup.sql postgres:/tmp/backup.sql
docker compose exec postgres psql -U ducktix -d ducktix -v ON_ERROR_STOP=1 -q -f /tmp/backup.sql
```

#### Opção B — pelo pgAdmin (interface gráfica)

1. Suba o pgAdmin (ele já vem configurado no `docker-compose.yml`):

   ```bash
   docker compose up -d pgadmin
   ```

2. Abra <http://localhost:5050>. Na primeira vez, o pgAdmin pede para criar
   uma *Master Password* (é só do pgAdmin; use qualquer uma, por exemplo
   `ducktix`).
3. Clique em **Add New Server**:
   - aba *General* → **Name**: `Ducktix`;
   - aba *Connection* → **Host name/address**: `postgres` · **Port**: `5432`
     · **Username**: `ducktix` · **Password**: `ducktix` · marque **Save
     password**;
   - clique em **Save**.
4. No painel da esquerda, abra **Servers → Ducktix → Databases** e clique no
   banco **ducktix**.
5. Menu **Tools → Restore...**:
   - **Format**: `Plain`;
   - **Filename**: `/backups/backup.sql` (a pasta `db/` do projeto aparece
     dentro do pgAdmin como `/backups`; não é preciso fazer upload);
   - clique em **Restore**. Um aviso no canto da tela indica quando
     terminou (alguns segundos).

Conferência (vale para as duas opções):

```bash
docker compose exec postgres psql -U ducktix -d ducktix -c "SELECT (SELECT count(*) FROM evento) AS eventos, (SELECT count(*) FROM inscricao WHERE status = 'ativa') AS inscricoes_ativas, (SELECT count(*) FROM check_in) AS check_ins;"
```

Resultado esperado: **30 eventos, 8864 inscrições ativas, 4779 check-ins**.

### 2.4 Configurar a aplicação

Copie o arquivo de exemplo de configuração:

```bash
cp .env.example .env.local
```

No Windows (PowerShell): `Copy-Item .env.example .env.local`.

Não é preciso editar nada: o `.env.example` já aponta para o banco do passo 2.2
(`postgresql://ducktix:ducktix@localhost:5433/ducktix`).

### 2.5 Instalar as dependências, compilar e executar

```bash
pnpm install
pnpm build
pnpm start
```

- `pnpm install` baixa as bibliotecas (leva alguns minutos na primeira vez).
  O aviso *Ignored build scripts: sharp* no fim é normal e pode ser ignorado.
- `pnpm build` compila a aplicação para produção.
- `pnpm start` executa a aplicação.

Abra <http://localhost:3000> no navegador. Para parar, use `Ctrl+C` no
terminal.

Para desenvolvimento (recarrega sozinho ao editar o código), use `pnpm dev` no
lugar de `pnpm build` e `pnpm start`.

### 2.6 Contas de demonstração

Todas as contas do banco de entrega usam a senha **`ducktix123`**.

| Perfil | E-mail | O que dá para ver |
|---|---|---|
| Organizador | `prefeitura-de-urubici@example.com` | *Festival de Inverno Tardio*: evento pago já realizado, com 1.084 inscritos, check-ins e cupom — o mais completo para ver os relatórios |
| Organizador | `instituto-camada-nove@example.com` | 2 eventos pagos, um deles com cupom |
| Organizador | `guilda-de-backend@example.com` | 2 eventos gratuitos |
| Organizador | demais `*@example.com` | 1 evento cada |
| Participante | `comprador@example.com` | compra de ingressos (os eventos futuros estão à venda) |

Para testar a compra com cupom: entre como organizador de um evento futuro,
crie um cupom na aba *Cupons* do evento e use o código no checkout. Um cupom
só vale no evento em que foi criado.

A lista completa de organizadores sai com:

```bash
docker compose exec postgres psql -U ducktix -d ducktix -c "SELECT email FROM usuario ORDER BY papel, email;"
```

Também é possível criar uma conta nova em `/register`.

### 2.7 Encerrar

```bash
docker compose down          # para o banco e mantém os dados
docker compose down -v       # para o banco e APAGA os dados (para começar do zero)
```

---

## 3. Roteiro de demonstração

### Participante

| Fluxo | Rota |
|---|---|
| Descobrir eventos (busca, categorias, cidade) | `/events` |
| Detalhe do evento e seleção de lote | `/events/[slug]` |
| Participantes, cupom e cobrança | `/checkout/[id]` |
| Pagamento simulado (Pix ou boleto) | `/checkout/[id]/payment` |
| Ingressos agrupados por pedido | `/my-tickets` |
| Detalhe com QR Codes e pedido de cancelamento | `/my-tickets/[id]` |

### Organizador

| Fluxo | Rota |
|---|---|
| Painel com indicadores | `/organizer` |
| Eventos (ocupação e receita) | `/organizer/events` |
| Criar evento | `/organizer/events/new` |
| Visão geral do evento — relatórios de participação e vendas por lote | `/organizer/events/[id]` |
| Editar, publicar, cancelar ou excluir evento | `/organizer/events/[id]/edit` |
| Lotes (criar, editar e excluir sem vendas) | `/organizer/events/[id]/lotes` |
| Pedidos | `/organizer/events/[id]/orders` |
| Participantes (lista nominal e presença) | `/organizer/events/[id]/attendees` |
| Check-in | `/organizer/events/[id]/check-in` |
| Cupons do evento — relatório de cupons | `/organizer/events/[id]/coupons` |
| Cancelamentos | `/organizer/events/[id]/cancellations` |

Os três relatórios são **por evento**, nas abas da página do evento. O SQL
equivalente de cada um está em [`ENTREGA.md`](ENTREGA.md), seção 4.4.

### O que depende de serviços externos

A execução local não precisa de nenhuma conta externa. Três recursos usam
serviços da nuvem e, sem as chaves, ficam desligados sem quebrar o resto:

| Recurso | Variável em `.env.local` | Sem a chave |
|---|---|---|
| E-mail de confirmação do pedido | `RESEND_API_KEY` | o pedido é confirmado normalmente; o e-mail não é enviado |
| E-mail de redefinição de senha | `RESEND_API_KEY` | o link não é enviado |
| Upload de capa do evento e foto de perfil | `BLOB_READ_WRITE_TOKEN` | o evento é criado sem imagem |

---

## 4. Outras formas de montar o banco

### 4.1 Esquema e dados separados (em vez do backup)

Numa base vazia (se já restaurou o backup, rode antes `docker compose down -v`
e `docker compose up -d postgres`):

```bash
docker compose cp db/schema.sql postgres:/tmp/schema.sql
docker compose cp db/seed.sql postgres:/tmp/seed.sql
docker compose exec postgres psql -U ducktix -d ducktix -v ON_ERROR_STOP=1 -q -f /tmp/schema.sql
docker compose exec postgres psql -U ducktix -d ducktix -v ON_ERROR_STOP=1 -q -f /tmp/seed.sql
```

| Arquivo | Conteúdo |
|---|---|
| `db/schema.sql` | DDL do esquema (tabelas, restrições e índices) — versão executável do dicionário de dados |
| `db/seed.sql` | dados sintéticos de demonstração |
| `db/backup.sql` | backup completo (`pg_dump`), esquema + dados |
| `drizzle/` | migrations usadas pela aplicação no deploy |

### 4.2 Banco vazio, só com as migrations

```bash
pnpm db:migrate
```

Cria as tabelas sem nenhum dado.

### 4.3 Gerar um backup atualizado

#### Opção A — por comando

```bash
docker compose exec postgres pg_dump -U ducktix --format=plain --no-owner --no-privileges ducktix > db/backup.sql
```

#### Opção B — pelo pgAdmin

Com o servidor já cadastrado (passos 1 a 4 da
[opção B da seção 2.3](#opção-b--pelo-pgadmin-interface-gráfica)):

1. Clique no banco **ducktix** e abra **Tools → Backup...**.
2. **Filename**: `/var/lib/pgadmin/backup.sql` · **Format**: `Plain`.
3. Clique em **Backup** e espere o aviso de conclusão.
4. O arquivo fica dentro do contêiner do pgAdmin. Copie-o para a pasta do
   projeto:

   ```bash
   docker compose cp pgadmin:/var/lib/pgadmin/backup.sql ./backup.sql
   ```

### 4.4 Consultar o banco pelo pgAdmin (opcional)

Depois de cadastrar o servidor (seção 2.3, opção B), a **Query Tool**
(**Tools → Query Tool**) roda SQL direto no banco — por exemplo, as consultas
dos relatórios da seção 4.4 do [`ENTREGA.md`](ENTREGA.md).

---

## 5. Alternativa sem Docker (PostgreSQL instalado no computador)

Com um PostgreSQL 16 instalado (veja o [guia](#64-postgresql-16-só-se-não-for-usar-docker)):

```bash
psql -U postgres -c "CREATE ROLE ducktix LOGIN PASSWORD 'ducktix';"
psql -U postgres -c "CREATE DATABASE ducktix OWNER ducktix;"
psql -U ducktix -h localhost -d ducktix -v ON_ERROR_STOP=1 -q -f db/backup.sql
```

Depois, em `.env.local`, troque a porta `5433` por `5432`:

```env
DATABASE_URL="postgresql://ducktix:ducktix@localhost:5432/ducktix"
```

e siga a partir do passo [2.5](#25-instalar-as-dependências-compilar-e-executar).

---

## 6. Guia de instalação das ferramentas

### 6.1 Git

- **Windows:** baixe em <https://git-scm.com/download/win> e instale com as
  opções padrão. Isso também instala o **Git Bash**, um terminal onde todos os
  comandos deste README funcionam.
- **macOS:** rode `git --version` no Terminal; se não estiver instalado, o
  sistema oferece instalar as *Command Line Tools*. Aceite.
- **Linux (Ubuntu/Debian):** `sudo apt install git`

### 6.2 Node.js e pnpm

Instale o **Node.js 20 ou mais novo** (versão LTS):

- **Windows e macOS:** baixe o instalador *LTS* em <https://nodejs.org> e
  instale com as opções padrão.
- **Linux (Ubuntu/Debian):** o Node do `apt` costuma ser antigo. Use o nvm:

  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  # feche e abra o terminal
  nvm install --lts
  ```

Feche e abra o terminal e confira com `node --version`.

O **pnpm** vem com o Node, só precisa ser ativado:

```bash
corepack enable
pnpm --version
```

Se o `corepack enable` der erro de permissão, use `npm install -g pnpm` (no
Linux/macOS pode ser preciso `sudo`).

> Sem pnpm, o npm (que vem com o Node) também funciona: troque `pnpm install`,
> `pnpm build` e `pnpm start` por `npm install`, `npm run build` e
> `npm start`.

### 6.3 Docker

- **Windows:** instale o **Docker Desktop** em
  <https://docs.docker.com/desktop/setup/install/windows-install/>. Ele pede
  para ativar o **WSL 2**; aceite e reinicie o computador se solicitado. Abra o
  Docker Desktop e espere o ícone indicar *Engine running*.
- **macOS:** instale o **Docker Desktop** em
  <https://docs.docker.com/desktop/setup/install/mac-install/> (escolha Apple
  Silicon ou Intel conforme o seu Mac) e abra-o.
- **Linux:** siga <https://docs.docker.com/engine/install/> para a sua
  distribuição (instala o Docker Engine e o plugin Compose). Para rodar sem
  `sudo`: `sudo usermod -aG docker $USER`, depois saia e entre de novo na
  sessão.

Confira com `docker compose version`.

### 6.4 PostgreSQL 16 (só se não for usar Docker)

- **Windows e macOS:** instalador em
  <https://www.postgresql.org/download/>. Anote a senha do usuário `postgres`
  definida na instalação. No Windows, o `psql` fica em
  `C:\Program Files\PostgreSQL\16\bin` (adicione ao PATH ou use o *SQL Shell*
  instalado junto).
- **Linux (Ubuntu/Debian):** `sudo apt install postgresql` e use
  `sudo -u postgres psql` no lugar de `psql -U postgres`.

---

## 7. Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `Cannot connect to the Docker daemon` / `error during connect` | O Docker não está rodando. Abra o Docker Desktop e espere iniciar. |
| `port is already allocated` ao subir o banco | Algo já usa a porta 5433. Pare esse serviço ou troque `5433:5432` em `docker-compose.yml` e a porta em `.env.local`. |
| `relation "..." already exists` ao restaurar o backup | O banco já tinha dados. Recomece do zero: `docker compose down -v`, `docker compose up -d postgres` e restaure de novo. |
| `ECONNREFUSED 127.0.0.1:5433` ao abrir a aplicação | O banco não está no ar ou ainda não ficou `healthy`. Rode `docker compose ps` e espere. |
| `pnpm: command not found` | Rode `corepack enable` (seção 6.2) ou use npm. |
| Erro de sintaxe ao rodar `pnpm install` ou `pnpm build` | Node.js antigo. `node --version` precisa ser 20 ou mais novo. |
| `Port 3000 is in use` | Outra aplicação usa a porta. Rode `pnpm start -p 3001` (com npm: `npm start -- -p 3001`) e abra <http://localhost:3001>. |
| Login recusado com uma conta de demonstração | Confira se o backup foi restaurado (passo 2.3) e se a senha é `ducktix123`. |
| No Windows, `cp` não é reconhecido | Use `Copy-Item .env.example .env.local` no PowerShell, ou o Git Bash. |

---

## 8. Tecnologias

- Next.js 15 (App Router) e React 19, TypeScript em modo strict
- PostgreSQL 16, Drizzle ORM e Drizzle Kit
- Tailwind CSS v4, Radix UI e Sonner

O backend é organizado por contexto em `ducktix/src/server/` (`identity`,
`event`, `ticketing`, `participation`), cada um com as camadas `domain`
(regras puras), `application` (casos de uso), `ports` (interfaces de
repositório) e `infrastructure` (PostgreSQL). A interface final é gráfica: as
escritas passam por Server Actions do Next.js, não por uma API REST.

## 9. Documentação técnica

| Documento | Conteúdo |
|---|---|
| [`ENTREGA.md`](ENTREGA.md) | documento da entrega: domínio, esquema conceitual, dicionário de dados, relatórios |
| [`ducktix/docs/README.md`](ducktix/docs/README.md) | índice da documentação técnica |
| [`ducktix/docs/diagramas/`](ducktix/docs/diagramas) | diagrama entidade-relacionamento (PNG, SVG e fonte Mermaid) |

Os dados de demonstração são sintéticos: nenhuma pessoa, organizador ou evento
existe, e os e-mails usam o domínio `example.com`, reservado e não entregável.
