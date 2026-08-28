---
title: Manifesto — Ducktix
tags:
  - ducktix
  - manifesto
  - produto
aliases:
  - Manifesto
  - Visão do Produto
status: em-planejamento
updated: 2026-08-27
---

# Manifesto — Ducktix

> [!abstract] Propósito deste documento
> Visão geral, escopo e propósito do produto. A fonte de verdade do produto é o [[PRD]].

## O que é

O **Ducktix** é um **sistema de gestão de eventos, ingressos e participantes**. Ele administra o ciclo completo de criação, publicação, venda, inscrição e participação em eventos — presenciais, online ou híbridos.

```mermaid
graph LR
    A[Criar evento] --> B[Publicar]
    B --> C[Abrir lote de ingressos]
    C --> D[Vender ingresso]
    D --> E[Inscrever participante]
    E --> F[Check-in]
    F --> G[Relatórios]
```

Este projeto é acadêmico (disciplina de Banco de Dados) e tem um objetivo secundário: servir como projeto de aprendizado de **Golang**.

## O problema

Organizar um evento envolve múltiplos processos interdependentes que precisam de consistência forte:

- Quantos ingressos de cada tipo/lote ainda estão disponíveis?
- Como evitar vender o último ingresso duas vezes em compras simultâneas?
- Quem já fez check-in e quem ainda não compareceu?
- Qual a receita e a ocupação real de cada evento?
- Como cancelar um pedido ou uma inscrição sem deixar o banco inconsistente?

## Posicionamento

> [!important] O Ducktix não é "um CRUD de eventos"
> É uma exploração completa do domínio de eventos, com entidades, relacionamentos, processos de negócio, transações e relatórios que demonstram domínio real de banco de dados.

A evolução pretendida do domínio:

`ENTIDADES → RELACIONAMENTOS → PROCESSOS DE NEGÓCIO → TRANSAÇÕES → REGRAS DE NEGÓCIO → RELATÓRIOS`

## Princípios inegociáveis

| Princípio | Significado prático |
|---|---|
| **Domínio não conhece infraestrutura** | O domínio não pode depender de PostgreSQL, HTTP, JSON ou Next.js. Ver [[guidelines]]. |
| **Sem microserviços** | Monólito modular com bounded contexts, não serviços distribuídos. |
| **Processos de negócio explícitos** | Toda tabela associativa relevante precisa de uma operação de negócio, não apenas CRUD. |
| **Concorrência controlada** | Venda de ingressos usa transação + `SELECT ... FOR UPDATE` para nunca vender o mesmo ingresso duas vezes. |
| **REST não é a interface final** | A interface final é o frontend Next.js; a API é um adaptador de entrada. |
| **SQL explícito** | Sem ORM pesado — queries legíveis com `pgx`, parametrizadas, organizadas por bounded context. |
| **Migrations, nunca init scripts** | Toda alteração de schema passa por migration versionada. |

As convenções que materializam esses princípios estão em [[guidelines]].

## Escopo do MVP (Fase 1)

> [!success] Dentro do escopo
> Eventos (presenciais/online/híbridos) · organizadores · locais · categorias · lotes de ingressos · tipos de ingresso · pedidos e itens de pedido · pagamentos · cupons · participantes · inscrições · check-in · cancelamentos · relatórios (eventos/participantes, vendas, check-in/presença) · API REST · frontend Next.js · CLI mínima.

> [!failure] Fora do escopo
> Banco de dados NoSQL (fica para a Fase 2) · microserviços · autenticação sofisticada · app mobile · design visual sofisticado · automações de marketing.

A arquitetura (ports/adapters) deve permitir a adaptação para NoSQL na Fase 2 sem reescrever regras de negócio.

## Arquitetura

**DDD + Arquitetura Hexagonal + Monólito Modular**, com bounded contexts:

- **Identity** — usuários, organizadores, participantes.
- **Event** — eventos, categorias, locais, publicação, capacidade.
- **Ticketing** — lotes, tipos de ingresso, pedidos, cupons, pagamentos.
- **Participation** — inscrições, ingressos emitidos, check-in.

Stack: **Go** (`pgx`/`pgxpool`, `golang-migrate`, `net/http`/`chi`) no backend, **PostgreSQL** como banco relacional, **Next.js** como interface final, e uma **CLI** mínima reutilizando os mesmos use cases da API.

## Estado atual do projeto

> [!warning] Nenhum código de produto foi escrito ainda
> O projeto está na fase de Discovery/Modelagem. Nenhuma entidade, migration, endpoint ou página foi implementada.

| Fase | Status |
|---|---|
| Discovery (domínio, entidades, bounded contexts) | 📋 Previsto |
| Modelagem (DER, esquema lógico, dicionário de dados) | 📋 Previsto |
| Infraestrutura (Docker Compose, migrations, seeds, backup) | 📋 Previsto |
| Backend (domain → application → ports → adapters) | 📋 Previsto |
| Frontend (Next.js) | 📋 Previsto |
| Testes | 📋 Previsto |
| Documentação final (`docs/fase-1.md`, ADRs) | 📋 Previsto |

## Mapa da documentação

- [[funcionalidades]] — catálogo de features previstas e implementadas
- [[guidelines]] — convenções de desenvolvimento
- [[fluxos]] — fluxos-chave do sistema
- [[glossario]] — termos de domínio do negócio
- [[backend/manifesto|Backend — Manifesto]] · [[backend/entidades|Entidades]] · [[backend/api|API]] · [[backend/services|Services]] · [[backend/signals|Signals]] · [[backend/crons|Crons]] · [[backend/fluxos|Fluxos técnicos]]
- [[frontend/manifesto|Frontend — Manifesto]] · [[frontend/componentes|Componentes]] · [[frontend/paginas|Páginas]] · [[frontend/estado|Estado]] · [[frontend/history-book|History Book]]
