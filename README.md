# Ducktix

Aplicação web de gestão de eventos, venda de ingressos, participantes,
check-in e relatórios. Projeto da disciplina de Banco de Dados II — UDESC,
Fase 1 (banco relacional).

Repositório: <https://github.com/uBrunoow/ducktix>

## Requisitos da Fase 1

O repositório entrega:

- código-fonte da aplicação em `src/`;
- esquema conceitual e lógico em `../documento_entrega_fase1.md` e `docs/`;
- PostgreSQL com schema, dados previamente inseridos e backup;
- instruções para instalação, compilação, execução e demonstração;
- interface web gráfica, não uma API REST como interface final;
- três relatórios que cruzam múltiplas tabelas.

O enunciado oficial está em [`../readme.md`](../readme.md). O documento formal
da entrega está em [`../documento_entrega_fase1.md`](../documento_entrega_fase1.md).

## Stack

- Node.js 20+
- pnpm 10+ ou npm 10+
- Next.js 15, React 19 e TypeScript strict
- PostgreSQL 16
- Drizzle ORM e Drizzle Kit
- Tailwind CSS, Radix UI e Sonner
- Vercel/Neon em produção

## Instalação rápida

```bash
pnpm install
cp .env.example .env.local
docker compose up -d
pnpm db:migrate
pnpm dev
```

Abra <http://localhost:3000>.

O arquivo `.env.local` é local e não deve ser commitado. Para usar npm,
substitua `pnpm` por `npm` nos comandos equivalentes.

## Configuração

Desenvolvimento local usa:

```env
DATABASE_URL="postgresql://ducktix:ducktix@localhost:5433/ducktix"
```

Para uploads em produção, configure na Vercel:

```env
BLOB_READ_WRITE_TOKEN="seu-token-do-vercel-blob"
```

Nunca coloque credenciais ou tokens no Git.

## Banco de dados

### Opção A — migrations Drizzle

Use esta opção para executar a aplicação com o schema atual:

```bash
docker compose up -d
pnpm db:migrate
```

Após alterar `src/server/db/schema.ts`:

```bash
pnpm db:generate
pnpm db:migrate
```

### Opção B — schema e dados da entrega

Para recriar uma base acadêmica populada:

```bash
docker compose up -d
docker compose exec -T postgres psql -U ducktix -d ducktix -v ON_ERROR_STOP=1 < db/schema.sql
docker compose exec -T postgres psql -U ducktix -d ducktix -v ON_ERROR_STOP=1 -q < db/seed.sql
```

Ou restaure o backup:

```bash
docker compose exec -T postgres psql -U ducktix -d ducktix -v ON_ERROR_STOP=1 < db/backup.sql
```

Os arquivos são:

| Arquivo | Finalidade |
|---|---|
| `db/schema.sql` | DDL relacional PostgreSQL 16 |
| `db/seed.sql` | Dados sintéticos previamente inseridos |
| `db/backup.sql` | Backup `pg_dump` sem compactação |
| `db/gerar-seed.mjs` | Gerador determinístico do seed |
| `drizzle/` | Migrations usadas pelo deploy |

Conferência básica:

```bash
docker compose exec -T postgres psql -U ducktix -d ducktix -c "
SELECT 'eventos', count(*)::text FROM evento
UNION ALL SELECT 'inscricoes ativas', count(*)::text FROM inscricao WHERE status='ativa'
UNION ALL SELECT 'check-ins', count(*)::text FROM check_in;"
```

O seed de entrega contém 30 eventos, 8.864 inscrições ativas e 4.779
check-ins. Os dados são sintéticos e usam `example.com`.

Para gerar um backup atualizado:

```bash
pg_dump --format=plain --no-owner --no-privileges \
  --host=localhost --port=5433 --username=ducktix ducktix > db/backup.sql
```

## Executar e validar

```bash
pnpm dev
pnpm exec tsc --noEmit
pnpm build
pnpm start
```

O build de produção aplica migrations antes da compilação quando executado
pela Vercel:

```bash
pnpm vercel-build
```

## Roteiro de demonstração

### Participante

| Fluxo | Rota |
|---|---|
| Descobrir eventos | `/events` |
| Detalhe do evento e seleção de lote | `/events/[slug]` |
| Participantes, cobrança e cupom | `/checkout/[id]` |
| Pagamento simulado | `/checkout/[id]/payment` |
| Confirmação | `/checkout/[id]/thank-you` |
| Ingressos agrupados por pedido | `/my-tickets` |
| Detalhe com QR Codes | `/my-tickets/[id]` |

### Organizador

| Fluxo | Rota |
|---|---|
| Visão geral | `/organizer` |
| Eventos | `/organizer/events` |
| Criar evento | `/organizer/events/new` |
| Editar evento | `/organizer/events/[id]/edit` |
| Lotes, edição e exclusão sem vendas | `/organizer/events/[id]/lotes` |
| Pedidos | `/organizer/events/[id]/orders` |
| Participantes | `/organizer/events/[id]/attendees` |
| Check-in | `/organizer/events/[id]/check-in` |
| Cupons por evento | `/organizer/events/[id]/coupons` |
| Relatórios | `/organizer/reports/events` |

## Processos de negócio

- Classificar evento em categorias.
- Criar pedido e adicionar lote ao carrinho.
- Reservar vagas e cancelar pedidos expirados ou trocados de evento.
- Aplicar cupom restrito ao evento e registrar seu uso.
- Confirmar pedido, registrar venda e emitir inscrição/ingresso.
- Validar ingresso e realizar check-in.
- Gerar relatórios de participação, vendas e cupons.

Cupons podem repetir o mesmo código em eventos diferentes, mas são únicos
dentro de cada evento. Lotes podem ser pagos ou gratuitos; um lote gratuito
tem `preco_centavos = 0`.

## Estrutura

```text
src/app/                 páginas, layouts e Server Actions
src/components/          componentes reutilizáveis da interface
src/server/identity/     autenticação, usuários e sessão
src/server/event/        eventos, categorias, lotes e relatórios
src/server/ticketing/    pedidos, cupons e checkout
src/server/participation/ingressos, inscrições e check-in
src/server/db/           schema e client Drizzle
db/                      DDL, seed e backup da entrega
drizzle/                 migrations versionadas
docs/                    documentação técnica e acadêmica
```

Cada bounded context usa `domain`, `application`, `ports` e `infrastructure`.
O domínio não depende de PostgreSQL, HTTP, React ou Next.js.

## Documentação

Comece por [`docs/README.md`](docs/README.md) e
[`docs/estado-atual.md`](docs/estado-atual.md).

| Documento | Conteúdo |
|---|---|
| `docs/modelo-conceitual.md` | entidades, relacionamentos e cardinalidades |
| `docs/modelo-logico.md` | dicionário de dados, normalização e índices |
| `docs/funcionalidades.md` | matriz de funcionalidades |
| `docs/fluxos.md` | fluxos da aplicação |
| `docs/glossario.md` | termos do domínio |
| `docs/guidelines.md` | convenções técnicas |
| `CLAUDE.md` | contexto operacional para agentes e contribuidores |

## Licença acadêmica e dados

Este é um projeto acadêmico. Os dados de demonstração são sintéticos e não
representam pessoas ou eventos reais.
