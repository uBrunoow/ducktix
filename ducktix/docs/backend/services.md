---
title: Backend — Services
tags:
  - ducktix
  - backend
  - dominio
aliases:
  - Services
  - Regras de Negócio
  - Processos de Negócio
updated: 2026-08-27
---

# Backend — Services

> [!abstract] Propósito
> Use cases de aplicação e regras de domínio — onde vive o processo de negócio. Contrato externo em [[api]]; dados em [[entidades]].

> [!warning] Estado atual
> ==Nenhum use case implementado.== Tudo abaixo é ==previsto== — ver [[../../prd|PRD]] seção 8.

## Princípio

> [!danger] Onde a regra vive
> `application/` orquestra o use case chamando `domain/` através de `ports/`. **Não conhece SQL nem HTTP.** `domain/` concentra a invariante de negócio. Nenhum processo de negócio é implementado como um simples INSERT — ver [[manifesto#Regras de organização]].

## Event

### `createEvent()`
Cadastra um evento em rascunho, vinculado a um organizador.

### `publishEvent()`
Publica um evento. Regras:
- evento precisa possuir organizador;
- evento online não precisa de local físico, mas presencial/híbrido sim;
- informações mínimas (nome, período, capacidade) precisam estar preenchidas;
- evento encerrado não pode ser republicado.

## Ticketing

### `createTicketBatch()`
Cria um lote de ingressos vinculado a um evento, em estado fechado.

### `openTicketBatch()`
Abre um lote para venda. Só permite abrir lote de evento publicado e ainda não encerrado.

### `createOrder()` / `addTicketToOrder()` / `confirmOrder()`
Fluxo de compra:

```text
Participante
    ↓
Pedido (createOrder)
    ↓
Item do Pedido (addTicketToOrder)
    ↓
Ingresso (confirmOrder → issueTicket)
```

`confirmOrder()` é transacional: valida pedido, valida disponibilidade, registra pagamento, emite ingressos, atualiza estoque de ingressos, altera status — ver [[fluxos#Transações]] e a estratégia de concorrência em [[fluxos#Concorrência]].

### `issueTicket()`
Emite um ingresso a partir de um item de pedido confirmado. Chamado internamente por `confirmOrder()`, nunca exposto como INSERT direto.

### `cancelOrder()`
Cancela um pedido. Regras:
- só cancela pedido pendente ou confirmado, nunca já cancelado;
- se já havia ingressos emitidos, eles são cancelados e o estoque do tipo de ingresso é devolvido.

### `applyCoupon()`
Aplica cupom a um pedido. Regras:
- cupom precisa estar dentro da validade (`valid_from`/`valid_until`);
- `usage_count < usage_limit`;
- recalcula `total_amount` do pedido.

## Participation

### `registerParticipant()`
Inscreve um participante em um evento (distinto de comprar ingresso, usado em eventos com inscrição própria). Regras:
- evento precisa estar publicado e dentro do período de inscrição;
- respeita capacidade do evento;
- não permite inscrição duplicada do mesmo participante no mesmo evento.

### `cancelRegistration()`
Cancela uma inscrição ativa. Não permite cancelar inscrição já cancelada.

### `checkInParticipant(ticketID)`
Processo de negócio mais sensível do domínio. Valida, nessa ordem:
- ingresso existe;
- ingresso pertence ao evento informado;
- ingresso está válido (não expirado);
- ingresso não foi cancelado;
- ingresso ainda não foi utilizado (sem check-in duplicado);
- evento está acontecendo ou permite check-in nesse momento;
- participante está de fato associado ao ingresso.

Somente após todas as validações o `check_in` é registrado — ver [[entidades#check_ins]].

## CRUD

Todas as entidades principais (`events`, `venues`, `categories`, `ticket_types`, `participants`, `organizers`, `coupons`) possuem CRUD completo: create, read (item e lista, com filtros quando fizer sentido), update, delete. Delete é soft delete apenas onde há justificativa de negócio (ex.: `events`, para preservar histórico de vendas e relatórios) — não é aplicado automaticamente em todas as tabelas.

## Relatórios

Consultas de leitura que cruzam múltiplas tabelas, organizadas em `infrastructure/postgres/queries/` por bounded context — ver [[api#Relatórios]] e [[fluxos#Relatórios]].
