---
title: Fluxos do Sistema
tags:
  - ducktix
  - fluxos
  - arquitetura
aliases:
  - Fluxos
  - Fluxos-chave
updated: 2026-08-27
---

# Fluxos do Sistema

> [!abstract] Propósito
> Fluxos-chave de ponta a ponta, do ponto de vista do produto. Fluxos técnicos internos do backend estão em [[backend/fluxos]].

> [!note] Estado atual
> Os fluxos abaixo correspondem à implementação atual. As regras ficam nos
> casos de uso em `src/server/`; as páginas apenas adaptam a interface.

## Arquitetura funcional

```mermaid
graph TD
    ID[Identity] --> EV[Event Management]
    EV --> TK[Ticketing]
    TK --> PA[Participation]
    EV --> W[Next.js Web]
    TK --> W
    PA --> W
```

## Criar e publicar evento

```mermaid
graph TD
    A[Organizador cria evento] --> B[Preencher dados mínimos]
    B --> C[Definir local/modalidade]
    C --> D[Definir capacidade]
    D --> E[createEvent]
    E --> F{Informações mínimas OK?}
    F -->|sim| G[publishEvent]
    F -->|não| H[Retorna erro de validação]
    G --> I[Evento publicado e visível]
```

> [!important] Evento encerrado não recebe novas inscrições
> `publishEvent` valida campos mínimos; encerrar um evento bloqueia `registerParticipant` e `addTicketToOrder`. Ver [[backend/services#Event Management]].

## Criar lote e tipo de ingresso

```mermaid
graph LR
    A[Evento] --> B[createTicketBatch]
    B --> C[openTicketBatch]
    C --> D[Definir tipos de ingresso]
    D --> E[Definir preço e quantidade]
```

## Comprar ingresso

```mermaid
graph TD
    A[Participante] --> B[Criar pedido]
    B --> C[Adicionar lote ao pedido]
    C --> D{Disponibilidade no lote?}
    D -->|sim, SELECT FOR UPDATE| E[Reservar item do pedido]
    D -->|não| F[Erro: lote esgotado]
    E --> G[Confirmar pedido]
    G --> H[BEGIN]
    H --> I[Validar pedido e disponibilidade]
    I --> J[Registrar pagamento]
    J --> K[issueTicket]
    K --> L[Atualizar estoque do lote]
    L --> M[Atualizar status do pedido]
    M --> N[COMMIT]
```

> [!important] Consistência na venda
> A confirmação registra a venda dentro de transação no adapter PostgreSQL e
> mantém o preço congelado no item do pedido.

## Aplicar cupom

```mermaid
graph LR
    A[Pedido em aberto] --> B[applyCoupon]
    B --> C{Cupom válido?}
    C -->|sim| D[Recalcular valor do pedido]
    C -->|não| E[Erro: cupom inválido/expirado]
```

## Cancelar pedido

```mermaid
graph TD
    A[Pedido confirmado] --> B[cancelOrder]
    B --> C{Ingressos já usados?}
    C -->|não| D[Cancelar ingressos emitidos]
    C -->|sim| E[Erro: não é possível cancelar]
    D --> F[Atualizar status do pedido]
    F --> G[Liberar estoque do lote, se aplicável]
```

## Inscrever participante

```mermaid
graph TD
    A[Participante] --> B[registerParticipant]
    B --> C{Evento aceita inscrições?}
    C -->|sim| D[Criar inscrição]
    C -->|não| E[Erro: evento encerrado/lotado]
    D --> F[Vincular ingresso, quando aplicável]
```

## Check-in

```mermaid
graph TD
    A[Ingresso apresentado] --> B[checkInParticipant]
    B --> C{Ingresso existe?}
    C -->|não| Z[Erro]
    C -->|sim| D{Pertence ao evento?}
    D -->|não| Z
    D -->|sim| E{Válido e não cancelado?}
    E -->|não| Z
    E -->|sim| F{Ainda não utilizado?}
    F -->|não| Z
    F -->|sim| G{Evento permite check-in agora?}
    G -->|não| Z
    G -->|sim| H[Registrar check-in]
    H --> I[Atualizar status de participação]
```

> [!important] Check-in não é um simples INSERT
> Ele valida existência, vínculo ao evento, validade, uso prévio e janela do
> evento antes de registrar a presença.

## Relatórios

```mermaid
graph TD
    A[Pedidos + Ingressos + Inscrições + Check-ins] --> B[Relatório de eventos e participantes]
    A --> C[Relatório de vendas de ingressos]
    A --> D[Relatório de check-in e presença]
```

Cada relatório cruza múltiplas tabelas (nunca consulta uma única tabela isolada). Ver [[backend/api#Relatórios]].
