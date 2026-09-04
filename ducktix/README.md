# Ducktix — compilação e execução

Sistema de gestão de eventos, ingressos e participantes.
Trabalho da disciplina de Banco de Dados II — UDESC, Fase 1.

Documento de entrega: [`../documento_entrega_fase1.md`](../documento_entrega_fase1.md)

---

## 1. Requisitos

| Software | Versão mínima | Verificar com |
|---|---|---|
| Node.js | 20 | `node --version` |
| npm | 10 | `npm --version` |
| PostgreSQL | 16 | `psql --version` |

---

## 2. Banco de dados

O esquema e a carga de dados ficam em `db/`.

### 2.0 Subir o Postgres de desenvolvimento (Docker)

```bash
docker compose up -d
cp .env.example .env.local   # já aponta para o Postgres do compose, porta 5433
```

Sobe **Postgres 16** (porta `5433`, para não colidir com um Postgres local na
5432) e **pgAdmin** (<http://localhost:5050>, login `dev@ducktix.com` /
`ducktix`) num volume nomeado que sobrevive a `docker compose down`. Para
apagar os dados também: `docker compose down -v`.

Sem Docker, siga 2.1/2.2 contra um Postgres já instalado e aponte
`DATABASE_URL` em `.env.local` para ele.

### 2.1 Criar do zero

```bash
docker compose exec -T postgres psql -U ducktix -d ducktix -v ON_ERROR_STOP=1 < db/schema.sql
docker compose exec -T postgres psql -U ducktix -d ducktix -v ON_ERROR_STOP=1 -q < db/seed.sql
```

(sem Docker: `createdb ducktix && psql -d ducktix -f db/schema.sql && psql -d ducktix -f db/seed.sql`)

### 2.2 Ou restaurar o backup

```bash
docker compose exec -T postgres psql -U ducktix -d ducktix -v ON_ERROR_STOP=1 < db/backup.sql
```

### 2.3 Conferir a carga

```bash
psql -d ducktix -c "
SELECT 'eventos', count(*)::text FROM evento
UNION ALL SELECT 'inscrições ativas', count(*)::text FROM inscricao WHERE status='ativa'
UNION ALL SELECT 'check-ins', count(*)::text FROM check_in;"
```

Resultado esperado: **30 eventos, 8.864 inscrições ativas, 4.779 check-ins**.

### 2.4 Gerar o backup novamente

```bash
pg_dump --format=plain --no-owner --no-privileges ducktix > db/backup.sql
```

### 2.5 Arquivos em `db/`

| Arquivo | O que é |
|---|---|
| `schema.sql` | DDL do esquema — corresponde ao dicionário de dados do documento de entrega |
| `seed.sql` | Carga de dados de demonstração (gerada, não editar à mão) |
| `backup.sql` | Backup `pg_dump` do banco já populado |
| `gerar-seed.mjs` | Regera `seed.sql` a partir da fixture da aplicação (`node db/gerar-seed.mjs`) |

> Todos os dados são **sintéticos**. Nenhuma pessoa, organizador ou local
> existe; os e-mails usam `example.com`, domínio reservado pela RFC 2606.

---

## 3. Aplicação

```bash
npm install
npm run dev
```

Abre em <http://localhost:3000>.

Para build de produção:

```bash
npm run build
npm run start
```

> **Nota sobre a Fase 1:** a maior parte dos repositórios ainda roda **em
> memória**, populados pela mesma fixture que gera o `seed.sql`. O contexto
> `identity` (`src/server/identity/infrastructure/drizzle-usuarios.ts`) já usa
> Drizzle/PostgreSQL, contra o banco de 2.0 — é a prova do padrão que os
> demais contextos (`event`, `ticketing`, `participation`) vão seguir. A troca
> não altera domínio nem casos de uso, porque toda implementação satisfaz o
> mesmo *port* (`src/server/*/ports/`). Ver `docs/modelo-mudancas.md`, seção 6.
>
> As senhas de demonstração em `db/seed.sql` (`$demo$ducktix123`) são um hash
> fictício, não o formato scrypt real de
> `src/server/identity/domain/senha.ts` — login com essas contas via
> Drizzle falha até o seed gerar hashes reais ou existir uma rota de
> cadastro que grave no Postgres. Cadastrar uma conta nova pelo formulário
> funciona normalmente.

---

## 4. Roteiro de demonstração

### 4.1 Vitrine pública (participante)

| Passo | Onde |
|---|---|
| Descobrir eventos | `/events` |
| Ver detalhe e escolher lote | `/events/corrida-da-lagoa-10k` |
| Checkout etapa 1 — participantes, cobrança, método | `/checkout/{id}` |
| Aplicar cupom | campo no resumo do pedido (use `PROMO10`) |
| Checkout etapa 2 — Pix com QR real, boleto com linha digitável | `/checkout/{id}/payment` |
| Confirmação e ingressos emitidos | `/checkout/{id}/thank-you` |
| Meus ingressos com QR de entrada | `/my-tickets` |

### 4.2 Back-office (organizador)

| Passo | Onde |
|---|---|
| Visão geral — receita, pedidos, participantes, check-ins | `/organizer` |
| Lista de eventos com ocupação e receita | `/organizer/events` |
| Detalhe do evento — curva de vendas, lotes, **lista nominal de participantes com check-in** | `/organizer/events/corrida-da-lagoa-10k` |
| CRUD — criar evento (assistente de 4 passos) | `/organizer/events/new` |
| CRUD — editar evento | `/organizer/events/{id}/edit` |
| CRUD — cupons e uso por evento | `/organizer/coupons` |
| **Os 3 relatórios** | `/organizer/reports/events` |

### 4.3 Requisitos da disciplina e onde estão

| Requisito | Onde demonstrar |
|---|---|
| CRUD de tabelas de entidade | `/organizer/events` (criar, ler, editar, publicar), `/organizer/coupons` |
| Processos de negócio das associativas | adicionar ao carrinho (`item_pedido`), aplicar cupom (`uso_de_cupom`), emitir ingresso (`inscricao`), check-in (`check_in`), classificar evento (`evento_categoria`), restringir campanha (`cupom_evento`) |
| 3 relatórios com JOIN | `/organizer/reports/events` |
| Banco com dados previamente inseridos | `db/backup.sql` |

---

## 5. Documentação

| Documento | Conteúdo |
|---|---|
| `docs/modelo-conceitual.md` | Esquema conceitual — entidades, relacionamentos, cardinalidades |
| `docs/modelo-logico.md` | Esquema lógico — dicionário de dados, normalização, índices |
| `docs/modelo-mudancas.md` | O que mudou em relação ao modelo previsto, e por quê |
| `docs/glossario.md` | Vocabulário de negócio |
| `docs/guidelines.md` | Convenções de código |
| `docs/DESIGN.md` | Design system da interface |

---

## 6. Estrutura do código

```
src/
  app/                 rotas (Next.js App Router)
    (public)/          vitrine: home, eventos, autenticação
    (private)/         checkout, meus ingressos, back-office
  components/          componentes de interface
  server/              backend, por bounded context
    identity/          usuários e sessão
    event/             eventos, lotes, catálogo, relatórios
    ticketing/         pedidos, cupons, checkout
    participation/     ingressos, inscrições
```

Cada contexto segue a mesma divisão:

```
domain/            regras de negócio puras (sem Postgres, HTTP ou React)
application/       casos de uso, orquestram domínio + ports
ports/             interfaces de repositório
infrastructure/    implementações (hoje em memória; Drizzle na sequência)
```

É essa separação que torna a Fase 2 (NoSQL) uma troca de `infrastructure/`, sem
reescrever regra de negócio.
