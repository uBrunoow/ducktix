# Ducktix — contexto do projeto

## Objetivo

Ducktix é uma aplicação web de gestão de eventos, venda de ingressos,
participantes, check-in e relatórios. O projeto atende à Fase 1 da disciplina
de Banco de Dados II da UDESC, com PostgreSQL como banco relacional.

## Stack atual

- Next.js 15 com App Router e React 19.
- TypeScript em modo strict.
- Drizzle ORM e PostgreSQL 16.
- `postgres` no desenvolvimento local e Neon Serverless em produção.
- Tailwind CSS v4, Radix UI e Sonner.
- Vercel para deploy.
- Vercel Blob para capas de eventos e fotos de perfil.

## Comandos principais

```bash
pnpm install
pnpm dev
pnpm exec tsc --noEmit
pnpm build
pnpm start
pnpm db:generate
pnpm db:migrate
```

NPM também funciona quando o projeto é instalado com npm. O lockfile oficial
do repositório é `pnpm-lock.yaml`.

## Banco local

```bash
docker compose up -d
cp .env.example .env.local
pnpm db:migrate
```

O Docker publica PostgreSQL em `localhost:5433` e pgAdmin em `localhost:5050`.
Para restaurar o backup acadêmico em uma base vazia, consulte `README.md`.

## Arquitetura

O backend é organizado por bounded context em `src/server/`:

```text
domain/          regras puras
application/     casos de uso
ports/           contratos de repositório
infrastructure/  Drizzle/PostgreSQL e integrações
```

Regras de negócio não devem depender de React, Next.js, HTTP ou SQL. Server
Actions, Server Components e Route Handlers são adaptadores de entrada.

## Banco e migrations

- `src/server/db/schema.ts` é a fonte do schema Drizzle.
- `drizzle/` contém migrations versionadas.
- `db/schema.sql` é o DDL/seed de entrega acadêmica para bootstrap local.
- `db/backup.sql` é o backup sem compactação exigido na entrega.
- Nunca commitar `.env.local`, tokens ou credenciais.

Toda alteração de schema deve gerar migration:

```bash
pnpm db:generate
pnpm db:migrate
```

## Regras importantes

- Dinheiro é armazenado em centavos inteiros.
- Cupom é restrito ao evento explicitamente vinculado; o mesmo código pode
  existir em eventos diferentes.
- Um pedido agrupa os ingressos comprados; a tela de meus ingressos agrupa por
  pedido.
- Lote com vendas não pode ser editado nem excluído.
- Lote pode ser pago ou gratuito; lote gratuito usa preço zero.
- Não alterar arquivos de usuário ou secrets sem solicitação explícita.
- Antes de concluir mudanças, executar `pnpm exec tsc --noEmit` e `git diff --check`.

## Documentação

O índice em `docs/README.md` aponta para modelagem, fluxos, funcionalidades,
estado atual e instruções da Fase 1. O documento formal da entrega fica em
`../documento_entrega_fase1.md`.
