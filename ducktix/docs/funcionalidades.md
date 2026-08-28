---
title: Funcionalidades
tags:
  - ducktix
  - catalogo
  - produto
aliases:
  - Catálogo de Features
  - Features
updated: 2026-08-27
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

> [!warning] Estado em 2026-08-27
> Nenhuma funcionalidade de produto implementada. O projeto está na fase de Discovery/Modelagem. ==Toda linha abaixo está em 📋.==

## Identity

| # | Funcionalidade | Status |
|---|---|---|
| F-01 | Cadastro e autenticação básica de usuários | 📋 |
| F-02 | Perfis: organizador e participante | 📋 |
| F-03 | CRUD de organizadores | 📋 |
| F-04 | CRUD de participantes | 📋 |

Detalhes técnicos: [[backend/entidades#Identity]], [[backend/api#Identity]].

## Eventos

| # | Funcionalidade | Status |
|---|---|---|
| F-10 | CRUD de eventos (presencial, online, híbrido) | 📋 |
| F-11 | Publicação de evento (`publishEvent`) com validação de campos mínimos | 📋 |
| F-12 | CRUD de categorias de evento | 📋 |
| F-13 | CRUD de locais (venues) | 📋 |
| F-14 | Encerramento de evento — bloqueia novas inscrições | 📋 |
| F-15 | Definição de capacidade do evento | 📋 |

Detalhes: [[backend/entidades#Event]], [[backend/services#Event Management]], [[frontend/paginas#Eventos]].

## Ticketing

| # | Funcionalidade | Status |
|---|---|---|
| F-20 | CRUD de tipos de ingresso | 📋 |
| F-21 | Criação e abertura de lotes de ingresso (`createTicketBatch`, `openTicketBatch`) | 📋 |
| F-22 | Criação de pedido e adição de itens (`createOrder`, `addTicketToOrder`) | 📋 |
| F-23 | Confirmação de pedido com emissão de ingressos (`confirmOrder`, `issueTicket`) | 📋 |
| F-24 | Cancelamento de pedido (`cancelOrder`) | 📋 |
| F-25 | Cupons de desconto e aplicação (`applyCoupon`) | 📋 |
| F-26 | Registro de pagamentos | 📋 |
| F-27 | Controle de concorrência na venda (transação + `SELECT ... FOR UPDATE`) | 📋 |

Detalhes: [[backend/entidades#Ticketing]], [[backend/services#Ticketing]], [[fluxos#Comprar ingresso]].

## Participation

| # | Funcionalidade | Status |
|---|---|---|
| F-30 | Inscrição de participante (`registerParticipant`) | 📋 |
| F-31 | Cancelamento de inscrição (`cancelRegistration`) | 📋 |
| F-32 | Check-in de participante (`checkInParticipant`) com validação de ingresso | 📋 |
| F-33 | Status de participação (inscrito, presente, cancelado) | 📋 |

Detalhes: [[backend/entidades#Participation]], [[backend/services#Participation]], [[fluxos#Check-in]].

## Relatórios

| # | Funcionalidade | Status |
|---|---|---|
| F-40 | Relatório de eventos e participantes (inscritos, presentes, ocupação) | 📋 |
| F-41 | Relatório de vendas de ingressos (quantidade, receita, status) | 📋 |
| F-42 | Relatório de check-in e presença | 📋 |

Detalhes: [[backend/api#Relatórios]].

## Plataforma

| # | Funcionalidade | Status |
|---|---|---|
| F-50 | API REST em Go como adaptador de entrada | 📋 |
| F-51 | CLI mínima reutilizando os mesmos use cases da API | 📋 |
| F-52 | Migrations versionadas (`golang-migrate`) | 📋 |
| F-53 | Seeds com dados realistas | 📋 |
| F-54 | Backup e restore do PostgreSQL | 📋 |
| F-55 | Frontend Next.js como interface final | 📋 |
| F-56 | Docker Compose com PostgreSQL e pgAdmin | 📋 |

## Fora do MVP (Fase 1)

> [!failure] Explicitamente não implementar nesta fase
> Banco de dados NoSQL · microserviços · autenticação sofisticada (OAuth, MFA) · app mobile · design visual sofisticado · automações de marketing · notificações por e-mail/WhatsApp/push.
