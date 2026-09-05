---
title: Glossário
tags:
  - ducktix
  - dominio
  - glossario
aliases:
  - Glossário
  - Termos de Domínio
updated: 2026-08-27
---

# Glossário

> [!abstract] Propósito
> Termos de domínio do negócio. Use exatamente esta linguagem em código, API, UI e conversas — ver [[guidelines]].

## Identity

### Usuário
Conta de acesso ao sistema. Pode assumir o perfil de organizador e/ou participante.

### Organizador
Usuário responsável por criar, publicar e gerenciar eventos, lotes de ingressos e cupons.

### Participante
Usuário que se inscreve em eventos, compra ingressos e realiza check-in.

## Event

### Evento
Entidade central do domínio. Pode ser presencial, online ou híbrido; possui organizador, período, capacidade e status (`rascunho`, `publicado`, `encerrado`, `cancelado`).

### Categoria
Classificação de um evento (ex.: tecnologia, música, esporte), usada em filtros e relatórios.

### Local (Venue)
Espaço físico onde um evento presencial ou híbrido acontece. Evento online não exige local físico.

### Publicação
Ação (`publishEvent`) que torna um evento visível e apto a vender ingressos, condicionada ao preenchimento das informações mínimas.

## Ticketing

### Lote (Ticket Batch)
Janela de disponibilidade de ingressos de um evento, com quantidade e período de venda próprios. Um evento pode ter múltiplos lotes sequenciais.

### Pedido (Order)
Solicitação de compra feita por um participante, composta por um ou mais itens de pedido. Estados: `aberto`, `confirmado`, `cancelado`.

### Item do Pedido (Order Item)
Vínculo entre um pedido e um lote, com quantidade e preço no momento da compra.

### Ingresso (Ticket)
Unidade emitida (`issueTicket`) após confirmação do pedido, vinculada a um participante e usada para check-in. Estados: `emitido`, `utilizado`, `cancelado`.

### Cupom (Coupon)
Código de desconto aplicável a um pedido, com validade, limite e vínculo
explícito ao evento. O mesmo código pode existir em eventos diferentes.

### Pagamento
Registro da liquidação financeira de um pedido, vinculado à confirmação (`confirmOrder`).

## Participation

### Inscrição (Registration)
Vínculo entre participante e evento (`registerParticipant`), podendo ou não estar associada a um ingresso pago.

### Check-in
Registro de comparecimento (`checkInParticipant`) de um participante em um evento, validando que o ingresso existe, pertence ao evento, é válido, não foi cancelado, ainda não foi utilizado e que o evento permite check-in no momento.

### Cancelamento
Ação sobre pedido (`cancelOrder`) ou inscrição (`cancelRegistration`) que invalida a compra/participação, respeitando regras (ex.: não cancelar ingresso já utilizado).

## Relatórios

### Relatório de Eventos e Participantes
Cruza evento, organizador, inscritos, presentes, capacidade e percentual de ocupação.

### Relatório de Vendas de Ingressos
Cruza evento, lote, tipo de ingresso, quantidade vendida, valor unitário, receita e status dos pedidos.

### Relatório de Cupons e Descontos
Cruza cupom, evento, uso de cupom e pedido para mostrar usos e descontos.

## Arquitetura e plataforma

### Bounded Context
Módulo do domínio com linguagem e regras próprias: **Identity**, **Event**, **Ticketing**, **Participation**, **Shared**.

### Aggregate
Conjunto de entidades tratadas como uma unidade de consistência (ex.: Pedido + Itens do Pedido).

### Repository Port
Interface que o domínio/aplicação usa para persistir e consultar dados, sem conhecer PostgreSQL.

### Use Case
Operação de aplicação que orquestra o domínio para realizar um processo de negócio (ex.: `confirmOrder`).

### Concorrência na venda
Estratégia (transação + `SELECT ... FOR UPDATE`) que impede duas compras simultâneas de vender o mesmo último ingresso de um lote.
