# Ducktix — contexto do projeto

## Objetivo

Ducktix é uma aplicação web de gestão de eventos, venda de ingressos,
participantes, check-in e relatórios. O projeto atende às Fases 1 e 2 da
disciplina de Banco de Dados II da UDESC: na Fase 2 a persistência passou do
PostgreSQL para o MongoDB.

## Stack atual

- Next.js 15 com App Router e React 19.
- TypeScript em modo strict.
- MongoDB 8 com o driver oficial `mongodb` (sem ODM).
- Vitest para os testes de integração.
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
pnpm test
pnpm db:setup
pnpm db:seed
pnpm db:reset
```

NPM também funciona quando o projeto é instalado com npm. O lockfile oficial
do repositório é `pnpm-lock.yaml`.

## Banco local

```bash
docker compose up -d
cp .env.example .env.local
pnpm db:setup
pnpm db:seed
```

O Docker publica MongoDB em `localhost:27017` e mongo-express em
`localhost:8081`. Os testes usam o database `ducktix_test`, recriado a cada
execução.

## Arquitetura

O backend é organizado por bounded context em `src/server/`:

```text
domain/          regras puras
application/     casos de uso
ports/           contratos de repositório
infrastructure/  MongoDB e integrações
```

Regras de negócio não devem depender de React, Next.js, HTTP ou do banco. Server
Actions, Server Components e Route Handlers são adaptadores de entrada.

## Banco

- `src/server/db/colecoes.ts` tipa os documentos de cada collection.
- `database/criar-banco.js` cria collections, validadores `$jsonSchema` e
  índices; é idempotente. Mudou o formato de um documento? Atualize os dois.
- `database/scripts/seed.mjs` converte `database/legacy-postgres/backup.sql`
  (Fase 1, somente leitura) nos documentos.
- O modelo e as decisões estão em `docs/migracao-postgresql-mongodb.md`.
- Nunca commitar `.env.local`, tokens ou credenciais.

## Regras importantes

- Dinheiro é armazenado em centavos inteiros.
- Cupom é restrito ao evento explicitamente vinculado; o mesmo código pode
  existir em eventos diferentes.
- Um pedido agrupa os ingressos comprados; a tela de meus ingressos agrupa por
  pedido.
- Lote com vendas não pode ser editado nem excluído.
- Lote pode ser pago ou gratuito; lote gratuito usa preço zero.
- Não alterar arquivos de usuário ou secrets sem solicitação explícita.
- Concorrência é resolvida com update condicional num único documento, não
  com transação.
- Antes de concluir mudanças, executar `pnpm exec tsc --noEmit`, `pnpm test` e
  `git diff --check`.

## Documentação

O índice em `docs/README.md` aponta para modelagem, fluxos, funcionalidades,
estado atual e a migração para MongoDB. O documento formal da Fase 1 fica em
`../ENTREGA.md`.
