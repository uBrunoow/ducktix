---
title: Funcionalidades
tags:
  - ducktix
  - catalogo
  - produto
aliases:
  - Catálogo de Features
  - Features
updated: 2026-09-01
---

# Funcionalidades

> [!abstract] Propósito
> Catálogo de features do Ducktix — previstas e implementadas. Escopo e princípios em [[manifesto]]; convenções em [[guidelines]].

## Legenda

| Símbolo | Significado |
|---|---|
| ✅ | Implementado e validado |
| 🚧 | Em implementação |
| 📋 | Previsto (não iniciado) |

> [!note] Estado atual
> O projeto está implementado como aplicação web Next.js. A matriz abaixo
> registra o estado funcional atual.

## Identity

| # | Funcionalidade | Status |
|---|---|---|
| F-01 | Cadastro e autenticação básica de usuários | ✅ |
| F-02 | Perfis: organizador e participante | ✅ |
| F-03 | CRUD de organizadores | 🚧 |
| F-04 | CRUD de participantes | ✅ |

Detalhes técnicos: [[backend/entidades#Identity]], [[backend/api#Identity]].

## Eventos

| # | Funcionalidade | Status |
|---|---|---|
| F-10 | CRUD de eventos (presencial, online, híbrido) | ✅ |
| F-11 | Publicação de evento com validação de campos mínimos | ✅ |
| F-12 | Categorias de evento e filtros | ✅ |
| F-13 | Local do evento | ✅ |
| F-14 | Cancelamento/encerramento de evento | ✅ |
| F-15 | Definição de capacidade por lotes | ✅ |

Detalhes: [[backend/entidades#Event]], [[backend/services#Event Management]], [[frontend/paginas#Eventos]].

## Ticketing

| # | Funcionalidade | Status |
|---|---|---|
| F-20 | Lotes pagos ou gratuitos | ✅ |
| F-21 | Criação, edição e abertura de lotes | ✅ |
| F-22 | Criação de pedido e adição de itens | ✅ |
| F-23 | Confirmação de pedido e emissão de ingressos | ✅ |
| F-24 | Cancelamento de pedido | ✅ |
| F-25 | Cupons por evento e aplicação | ✅ |
| F-26 | Pagamento simulado | ✅ |
| F-27 | Controle de estoque na venda | ✅ |

Detalhes: [[backend/entidades#Ticketing]], [[backend/services#Ticketing]], [[fluxos#Comprar ingresso]].

## Participation

| # | Funcionalidade | Status |
|---|---|---|
| F-30 | Inscrição de participante | ✅ |
| F-31 | Cancelamento de inscrição | 🚧 |
| F-32 | Check-in com validação de ingresso | ✅ |
| F-33 | Status de participação | ✅ |

Detalhes: [[backend/entidades#Participation]], [[backend/services#Participation]], [[fluxos#Check-in]].

## Relatórios

| # | Funcionalidade | Status |
|---|---|---|
| F-40 | Relatório de eventos e participantes | ✅ |
| F-41 | Relatório de vendas de ingressos | ✅ |
| F-42 | Relatório de cupons e descontos | ✅ |

Detalhes: [[backend/api#Relatórios]].

## Plataforma

| # | Funcionalidade | Status |
|---|---|---|
| F-50 | Server Components e Server Actions como adaptadores | ✅ |
| F-51 | CLI mínima (`tsx scripts/cli.ts`) reutilizando os mesmos use cases | 📋 |
| F-52 | Migrations versionadas (`drizzle-kit`) | ✅ |
| F-53 | Seeds com dados sintéticos | ✅ |
| F-54 | Backup e restore do PostgreSQL | ✅ |
| F-55 | Frontend Next.js (App Router) como interface final | ✅ |
| F-56 | Postgres local em Docker Compose e Neon em produção | ✅ |

## Fora do MVP (Fase 1)

> [!failure] Explicitamente não implementar nesta fase
> Banco de dados NoSQL · microserviços · autenticação sofisticada (OAuth, MFA) · app mobile · design visual sofisticado · automações de marketing · notificações por e-mail/WhatsApp/push.
