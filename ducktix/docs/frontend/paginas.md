---
title: Frontend — Páginas
tags:
  - ducktix
  - frontend
  - rotas
aliases:
  - Páginas
  - Rotas
updated: 2026-08-27
---

# Frontend — Páginas

> [!abstract] Propósito
> Mapa de rotas e páginas. Componentes em [[componentes]]; endpoints em [[../backend/api]].

> [!warning] Estado atual
> ==Nenhuma rota implementada.== Não existe diretório `frontend/` no repositório ainda. Todas as rotas abaixo são ==previstas==, conforme a lista mínima do PRD (seção 20).

## Navegação

```
DUCKTIX
├── Dashboard
├── Eventos
│   ├── Lista
│   ├── Novo evento
│   └── Detalhe / Edição
├── Lotes de ingressos
├── Ingressos
├── Participantes
├── Pedidos
├── Check-in
└── Relatórios
    ├── Eventos e participantes
    ├── Vendas de ingressos
    └── Check-in e presença
```

## Mapa de rotas

| Rota | Página | Endpoint principal |
|---|---|---|
| `/dashboard` | Visão geral | `GET /events`, `GET /reports/*` |
| `/events` | Lista de eventos | `GET /events` |
| `/events/new` | Cadastro de evento | `POST /events` |
| `/events/:id` | Detalhe do evento | `GET /events/:id` |
| `/events/:id/edit` | Edição do evento | `PUT /events/:id` |
| `/ticket-batches` | Lotes de ingressos | `POST /events/:id/ticket-batches` |
| `/tickets` | Ingressos emitidos | `GET /tickets` |
| `/participants` | Participantes | `GET /participants` |
| `/orders` | Pedidos | `POST /orders`, `POST /orders/:id/confirm` |
| `/check-ins` | Check-in | `POST /tickets/:id/check-in` |
| `/reports/events` | Relatório: eventos e participantes | `GET /reports/events` |
| `/reports/sales` | Relatório: vendas de ingressos | `GET /reports/sales` |
| `/reports/check-ins` | Relatório: check-in e presença | `GET /reports/check-ins` |

> [!danger] Interface administrativa simples
> O PRD não exige autenticação sofisticada nem controle de acesso refinado no frontend (seção 21/37). Proteção de rota, quando existir, é conveniência — a validação real fica no backend.

## Dashboard

Visão geral operacional: eventos próximos, total de inscritos, ocupação e vendas recentes, com atalhos para eventos, pedidos e check-in.

## Detalhe do evento

`/events/:id` — página central do evento.

| Seção | Conteúdo |
|---|---|
| Header | Nome, organizador, local/modalidade, status, período |
| Lotes de ingressos | Lista de lotes com tipo de ingresso, preço, disponibilidade |
| Pedidos | Pedidos vinculados ao evento |
| Inscritos | Participantes inscritos e status de check-in |
| Ações | Publicar evento, abrir lote, cancelar evento |

## Check-in

`/check-ins` — busca de ingresso por código/participante e confirmação de presença, refletindo as regras descritas em [[../backend/services]] (ingresso válido, não cancelado, não utilizado).

## Relatórios

As três páginas de relatório (`/reports/events`, `/reports/sales`, `/reports/check-ins`) seguem o mesmo padrão: filtros no topo (período, evento, categoria/lote conforme o relatório) e tabela de resultados. Ver definição completa em [[../backend/api]].

## Estados por página

Toda página deve tratar loading, lista vazia e erro de forma explícita, conforme [[componentes]].
