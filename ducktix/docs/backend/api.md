---
title: Backend — API
tags:
  - ducktix
  - backend
  - api
aliases:
  - API
  - Endpoints
updated: 2026-08-27
---

# Backend — API

> [!abstract] Propósito
> Contrato dos Route Handlers do Ducktix, organizado por bounded context. Entidades em [[entidades]]; regras em [[services]].

> [!warning] Estado atual
> ==Nenhum endpoint implementado.== O projeto está em fase de Discovery/Modelagem — ver [[../../prd|PRD]]. Todos abaixo são ==previstos==.

> [!note] Rota vs. Server Component/Action
> Nem toda operação abaixo vira necessariamente um Route Handler. Páginas que só leem dados preferem chamar o use case direto de um Server Component (sem round-trip HTTP interno); mutações de formulário simples preferem Server Actions. Os Route Handlers em `src/app/api/**` existem para os casos que realmente precisam de fetch client-side (ex.: filtros dinâmicos de relatório) — ver [[../../prd|PRD]] seção 20.

## Convenções

| Tema | Regra |
|---|---|
| Prefixo | `src/app/api/...` (Route Handlers do Next.js) — exemplos abaixo seguem [[../../prd|PRD]] seção 19 |
| Camada | A API interna é apenas um adapter de entrada a mais; a interface final é o [[../frontend/manifesto\|frontend Next.js]] |
| Fluxo | `Route Handler / Server Action / Server Component → Application Use Case → Domain → Repository Port → PostgreSQL Adapter` — ver [[fluxos]] |
| Regra de negócio | ==Nunca no handler.== Handler faz apenas parse (Zod) → use case → response |
| SQL | Sempre parametrizado, nunca concatenado |
| Erros | Erros de domínio mapeados para status HTTP; nunca stack trace ao cliente |
| Auth | Simplificada — não é o foco acadêmico do trabalho, ver [[../../prd|PRD]] seção 36 |

## Eventos (Event)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/events` | Cria evento — `createEvent()` |
| `GET` | `/events` | Lista eventos, com filtros |
| `GET` | `/events/:id` | Detalhe do evento |
| `PUT` | `/events/:id` | Atualiza evento |
| `DELETE` | `/events/:id` | Remove ou cancela evento |
| `POST` | `/events/:id/publish` | Publica evento — `publishEvent()`, ver [[services#publishEvent]] |

## Ingressos (Ticketing)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/events/:id/ticket-batches` | Cria lote de ingressos — `createTicketBatch()` |
| `POST` | `/ticket-batches/:id/open` | Abre lote — `openTicketBatch()` |
| `POST` | `/orders` | Cria pedido — `createOrder()` |
| `POST` | `/orders/:id/items` | Adiciona ingresso ao pedido — `addTicketToOrder()` |
| `POST` | `/orders/:id/confirm` | Confirma pedido — `confirmOrder()`, transacional, ver [[fluxos#Transações]] |
| `POST` | `/orders/:id/cancel` | Cancela pedido — `cancelOrder()` |
| `POST` | `/orders/:id/coupon` | Aplica cupom — `applyCoupon()` |

## Participação (Participation)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/events/:id/register` | Inscreve participante — `registerParticipant()` |
| `POST` | `/registrations/:id/cancel` | Cancela inscrição — `cancelRegistration()` |
| `POST` | `/tickets/:id/check-in` | Realiza check-in — `checkInParticipant()`, ver [[services#checkInParticipant]] |

## Relatórios

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/reports/events` | Eventos e participantes: inscritos, presentes, capacidade, ocupação |
| `GET` | `/reports/sales` | Vendas de ingressos: quantidade vendida, receita, status dos pedidos |
| `GET` | `/reports/check-ins` | Check-in e presença por evento/período |

> [!important] Relatórios envolvem múltiplas tabelas
> Nenhum relatório consulta apenas uma tabela — ver [[../../prd|PRD]] seção 10.

## CLI

Além das rotas acima, existe um script CLI (`scripts/cli.ts`, rodado localmente via `tsx`/`npm run cli`) que reutiliza os mesmos use cases (`application/`), sem duplicar regra de negócio — ver [[fluxos#CLI]].

```text
Event Management CLI

1 - Eventos
2 - Participantes
3 - Ingressos
4 - Pedidos
5 - Check-in
6 - Relatórios
0 - Sair
```
