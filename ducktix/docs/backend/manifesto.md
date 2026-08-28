---
title: Backend — Manifesto
tags:
  - ducktix
  - backend
  - arquitetura
aliases:
  - Manifesto do Backend
updated: 2026-08-27
---

# Backend — Manifesto

> [!abstract] Propósito
> Stack, bibliotecas e estrutura do backend, que roda **dentro do próprio Next.js**. Convenções gerais em [[guidelines]]; visão de produto em [[manifesto]].

## Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript (`strict: true`) |
| Runtime | Node.js (runtime do Next.js) |
| Banco | PostgreSQL 16 (Neon serverless em produção) |
| ORM/Driver | Drizzle ORM + `@neondatabase/serverless` (driver serverless do Neon) |
| Migrations | `drizzle-kit` |
| HTTP | Route Handlers do Next.js (`src/app/api/**/route.ts`) |
| Admin de banco | pgAdmin (local) / console do Neon (produção) |
| Testes | Vitest (unitários) + testes de integração contra Postgres real |
| Deploy | Vercel (Next.js, free tier) + Neon (Postgres serverless, free tier) |
| Containers | Docker Compose (**somente desenvolvimento local**) |

## Princípio arquitetural

**DDD lite + camadas (domain/application/ports/infrastructure) + monólito full stack em Next.js.** Não há microserviços nem um backend separado — o "backend" é apenas a metade server-side do mesmo projeto Next.js, organizada em bounded contexts isolados por pasta em `src/server/`. Isso elimina a necessidade de hospedar e pagar por um servidor dedicado: o único deploy é o Next.js na Vercel, falando direto com um Postgres gerenciado.

```
Domain
  ↓
Application
  ↓
Ports
  ↓
Infrastructure (Postgres) / Adapters de entrada (Route Handlers, Server Actions, Server Components, CLI)
```

> [!danger] O domínio não conhece infraestrutura
> `domain/` não importa Drizzle, Next.js (`Request`/`Response`), React ou qualquer tecnologia externa. Toda dependência de infraestrutura entra via `ports/` (interfaces) e é implementada em `infrastructure/`. Isso é o que permite trocar Postgres por um banco NoSQL na Fase 2 sem reescrever regra de negócio — ver [[../glossario|Glossário]].

## Bounded contexts

```
src/server/
├── identity/       usuários, organizadores, participantes
├── event/          eventos, categorias, locais, publicação
├── ticketing/       lotes, tipos de ingresso, pedidos, pagamentos, cupons
├── participation/  inscrições, ingressos emitidos, check-in
└── shared/         contratos, tipos compartilhados e o pool de conexão Postgres
```

Cada bounded context é internamente dividido em quatro camadas:

| Camada | Conteúdo |
|---|---|
| `domain/` | entities/tipos, value objects, regras de domínio, erros de domínio |
| `application/` | use cases, commands, queries, orquestração (incluindo transações) |
| `ports/` | interfaces de repository e de serviços externos |
| `infrastructure/` | implementação concreta com Drizzle ORM (driver serverless do Neon) |

## Estrutura prevista

```
event-platform/
├── src/
│   ├── app/
│   │   ├── (site)/        páginas (dashboard, events, orders, check-ins, reports...)
│   │   └── api/           Route Handlers usados por partes client-side da UI
│   ├── server/
│   │   ├── identity/{domain,application,ports,infrastructure}
│   │   ├── event/{domain,application,ports,infrastructure}
│   │   ├── ticketing/{domain,application,ports,infrastructure}
│   │   ├── participation/{domain,application,ports,infrastructure}
│   │   └── shared/db/client.ts   instância do Drizzle sobre o driver Neon
│   └── components/
├── scripts/
│   └── cli.ts
├── migrations/
├── seeds/
├── docs/
├── docker-compose.yml
├── package.json
└── .env.example
```

> [!warning] Estado atual
> ==Nenhum código implementado ainda.== O projeto está na fase de Discovery/Modelagem (ver [[../../prd|PRD]]). Toda a estrutura acima é ==prevista==.

## Regras de organização

> [!danger] Separação obrigatória
> - Route Handlers, Server Actions, Server Components e o script CLI apenas fazem parse/validação (ex.: Zod) e response. **Sem regra de negócio.**
> - `application/` orquestra use cases chamando o domínio via `ports/`. **Não conhece SQL nem Next.js.**
> - `domain/` concentra invariantes e regras de negócio puras (funções TypeScript sem dependências externas).
> - Queries complexas de relatório ficam organizadas em `infrastructure/postgres/queries/`, nunca espalhadas pelo sistema.
> - Nada vai para um `utils` ou `helpers` genérico.

Adicionar um bounded context ou trocar o banco de dados não deve exigir alterar `domain/` de outro contexto.

## Configuração

Variáveis de ambiente via `.env.local` (nunca versionado), com `.env.example` documentando: `DATABASE_URL` (connection string do Neon em produção, Postgres local em desenvolvimento).

## Comandos previstos

| Comando | O que faz |
|---|---|
| `npm run db:up` / `npm run db:down` | Sobe/derruba Docker Compose (Postgres local + pgAdmin) |
| `npm run migrate` | Gera/aplica migrations com `drizzle-kit` |
| `npm run seed` | Popula dados de demonstração |
| `npm run dev` | Sobe o Next.js (frontend + backend) em desenvolvimento |
| `npm run cli` | Roda o script CLI (`tsx scripts/cli.ts`) |
| `npm run test` | Testes unitários e de integração |
| `npm run lint` | Lint do código TypeScript |
| `npm run backup` | Gera dump do PostgreSQL |

## Documentos relacionados

[[entidades]] · [[api]] · [[services]] · [[signals]] · [[crons]] · [[fluxos]] · [[../frontend/manifesto|Frontend]]
