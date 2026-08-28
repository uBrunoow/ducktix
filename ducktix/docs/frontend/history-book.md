---
title: Frontend — History Book
tags:
  - ducktix
  - frontend
  - design-system
  - storybook
aliases:
  - History Book
  - Documentação Visual
updated: 2026-08-27
---

# Frontend — History Book

> [!abstract] Propósito
> Documentação visual dos componentes: o que cada um mostra, quais variações existem e como se comporta em cada estado. Catálogo técnico em [[componentes]].

> [!warning] Estado atual
> ==Nada implementado.== Não existe frontend, Storybook nem componentes ainda. Este documento descreve a convenção ==prevista== para quando os componentes de [[componentes]] forem criados.

## Convenção de story

Toda story de componente de domínio deve documentar, no mínimo:

1. **Default** — o caso normal
2. **Variações** — cada valor relevante de prop (status de evento, status de pedido, tipo de ingresso)
3. **Loading** — skeleton
4. **Empty** — sem dados
5. **Error** — falha com ação de recuperação

Estrutura esperada:

```
Componente.tsx
Componente.stories.tsx
```

Com `title` agrupando por camada: `UI/…`, `Layout/…`, `States/…`, `Domain/…`.

## Catálogo previsto

### Estados

| Story | Documenta |
|---|---|
| `States/PageSkeleton` | Skeletons por tipo de layout |
| `States/EmptyState` | Sem eventos, sem pedidos, sem ingressos |
| `States/ErrorState` | Erro genérico de requisição |

### Domínio

| Story | Variações a documentar |
|---|---|
| `Domain/EventCard` | Rascunho, Publicado, Encerrado, Cancelado |
| `Domain/EventStatusBadge` | Todos os status de evento |
| `Domain/OrderStatusBadge` | Pendente, Confirmado, Cancelado |
| `Domain/TicketBatchForm` | Lote aberto, lote esgotado |
| `Domain/CheckInForm` | Ingresso válido, já utilizado, cancelado |
| `Domain/ReportTable` | Poucas linhas, muitas linhas, sem resultado |
| `Domain/OccupancyBadge` | Ocupação baixa, média, alta, esgotado |

## Acessibilidade

Verificar contraste, foco visível, navegação por teclado e labels em campos — e não comunicar status apenas por cor (`EventStatusBadge` e `OrderStatusBadge` precisam de texto além da cor).

## Manutenção

O History Book deve ser atualizado junto com o componente, no mesmo commit.

> [!note] Componente novo sem story é considerado incompleto.
