---
title: Frontend — Componentes
tags:
  - ducktix
  - frontend
  - design-system
aliases:
  - Componentes
  - Catálogo de Componentes
updated: 2026-08-27
---

# Frontend — Componentes

> [!abstract] Propósito
> Catálogo de componentes previstos para o frontend. Documentação visual em [[history-book]]; estrutura em [[manifesto]].

> [!warning] Estado atual
> ==Nenhum componente implementado.== Não existe diretório `frontend/` ainda. Todo o catálogo abaixo é ==previsto==.

## Legenda

✅ implementado · 🚧 em implementação · 📋 previsto

## Primitivas (`components/ui/`)

| Componente | Status |
|---|---|
| `Button` · `Card` · `Badge` · `Alert` | 📋 |
| `Table` · `Pagination` | 📋 |
| `Input` · `Select` · `DatePicker` | 📋 |
| `Dialog` · `Tabs` | 📋 |

> [!note] Regra
> Primitiva não conhece domínio. Nada de "evento" ou "ingresso" dentro de `components/ui/`.

## Layout (`components/layout/`)

| Componente | Responsabilidade | Status |
|---|---|---|
| `AppShell` | Estrutura da área administrativa | 📋 |
| `Sidebar` | Navegação principal (eventos, ingressos, pedidos, check-in, relatórios) | 📋 |
| `Header` | Título da página, ações contextuais | 📋 |

## Estados

> [!danger] Obrigatórios em toda página
> Nenhuma tela pode ficar sem loading, empty e error.

| Componente | Contrato | Status |
|---|---|---|
| `PageSkeleton` | Skeleton por tipo de layout | 📋 |
| `EmptyState` | Explicação + próximo passo + CTA | 📋 |
| `ErrorState` | Mensagem amigável + ação de recuperação | 📋 |

## Domínio (`components/domain/`)

| Componente | Responsabilidade | Status |
|---|---|---|
| `EventCard` | Resumo do evento: nome, período, local/modalidade, status | 📋 |
| `EventForm` | Cadastro/edição de evento | 📋 |
| `EventStatusBadge` | Rascunho, Publicado, Encerrado, Cancelado | 📋 |
| `TicketBatchForm` | Cadastro de lote de ingressos (preço, quantidade, período de venda) | 📋 |
| `TicketTypeSelect` | Seleção de tipo de ingresso dentro de um lote | 📋 |
| `OrderTable` | Lista de pedidos com status e valor | 📋 |
| `OrderStatusBadge` | Pendente, Confirmado, Cancelado | 📋 |
| `OrderForm` | Criação de pedido (participante + itens) | 📋 |
| `TicketList` | Ingressos emitidos de um pedido/evento | 📋 |
| `CheckInForm` | Busca de ingresso e confirmação de presença | 📋 |
| `ParticipantForm` | Cadastro/edição de participante | 📋 |
| `CouponBadge` | Cupom aplicado, com desconto | 📋 |
| `ReportFilterBar` | Filtros comuns aos relatórios (período, evento, categoria/lote) | 📋 |
| `ReportTable` | Tabela de resultado dos relatórios | 📋 |
| `OccupancyBadge` | Percentual de ocupação do evento | 📋 |

## Convenções

| Tema | Regra |
|---|---|
| Nomenclatura | PascalCase; arquivo com o nome do componente |
| Tipagem | Props explícitas, sem `any`; tipos do contrato em `src/types/` |
| Composição | Preferir composição a props booleanas acumuladas |
| Dados | Componente de domínio recebe dados prontos; ==não decide regra de negócio== |
| Server vs Client | Server Component por padrão; `"use client"` só quando há interatividade |
| Stories | Todo componente de domínio deve ter story — ver [[history-book]] |

> [!danger] Proibições
> Não validar regra de negócio crítica dentro de componente React (ex.: "lote esgotado") · não duplicar componente entre páginas · não criar botão sem ação.
