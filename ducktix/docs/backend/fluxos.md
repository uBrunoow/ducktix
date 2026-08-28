---
title: Backend — Fluxos Técnicos
tags:
  - ducktix
  - backend
  - fluxos
aliases:
  - Fluxos do Backend
updated: 2026-08-27
---

# Backend — Fluxos Técnicos

> [!abstract] Propósito
> Como as camadas do backend colaboram em cada operação. Fluxos de produto em [[../fluxos]]; use cases em [[services]].

> [!warning] Estado atual
> ==Nenhum fluxo implementado.== Tudo abaixo é ==previsto==.

## Anatomia de uma requisição

```mermaid
graph TD
    A["Adapter (Route Handler / Server Action / Server Component)"] --> B[Application Use Case]
    B --> C[Domain]
    C --> D[Repository Port]
    D --> E[PostgreSQL Adapter]
    E --> F[Response]
    B -.erro de validação.-> X[400 VALIDATION_ERROR]
    C -.erro de domínio.-> Y[422 erro estruturado]
```

> [!danger] API não é domínio
> Nunca `Route Handler → SQL` nem `Route Handler → Repository` direto — o mesmo vale para Server Components e Server Actions. O fluxo sempre passa por `Application Use Case → Domain → Repository Port` — ver [[../../prd|PRD]] seção 22. A mesma cadeia de use cases é reutilizada pela [[api#CLI|CLI]], sem duplicar regra de negócio.

## Transações — `confirmOrder()`

```mermaid
sequenceDiagram
    participant A as Application
    participant D as Domain
    participant P as Postgres Adapter
    A->>P: BEGIN
    A->>D: validar pedido
    A->>P: SELECT ... FOR UPDATE ticket_types
    A->>D: validar disponibilidade
    A->>P: registrar payment
    A->>D: issueTicket() por item
    A->>P: atualizar quantity_sold
    A->>P: atualizar status do order
    A->>P: COMMIT
    Note over A,P: Qualquer falha dispara ROLLBACK
```

Todo processo de negócio que altera múltiplas tabelas usa transação PostgreSQL explícita, obtida com `pool.connect()` e `BEGIN`/`COMMIT`/`ROLLBACK` manuais ao redor do use case — nunca queries "soltas" direto no pool compartilhado — ver [[services#confirmOrder]] e [[../../prd|PRD]] seção 12.

## Concorrência na venda de ingressos

```mermaid
graph TD
    A[Duas compras simultâneas do último ingresso] --> B[SELECT ... FOR UPDATE em ticket_types]
    B --> C{quantity_sold < quantity_total?}
    C -->|sim| D[Reserva, incrementa quantity_sold, COMMIT]
    C -->|não| E[Rejeita, ROLLBACK]
    D --> F[Segunda transação aguarda o lock]
    F --> C
```

> [!danger] Estratégia de concorrência
> Row-level locking via `SELECT ... FOR UPDATE` sobre `ticket_types` dentro da transação de `confirmOrder()`, combinado com `CHECK (quantity_sold <= quantity_total)` como segunda linha de defesa. Isso evita que duas compras concorrentes vendam o mesmo último ingresso — ver [[../../prd|PRD]] seção 13.

## Check-in

```mermaid
sequenceDiagram
    participant A as Application
    participant D as Domain
    participant P as Postgres Adapter
    A->>P: buscar ticket por id
    A->>D: validar existência, evento, validade, não cancelado, não usado
    A->>D: validar evento em andamento/permite check-in
    A->>D: validar vínculo participante-ingresso
    A->>P: INSERT check_ins
    A->>P: UPDATE tickets SET status = 'utilizado'
```

Validações detalhadas em [[services#checkInParticipant]].

## Relatórios

```mermaid
graph TD
    A[GET /api/reports/...] --> B[Application Query]
    B --> C[Query Drizzle organizada em infrastructure/postgres/queries/]
    C --> D[Cruza múltiplas tabelas]
    D --> E[DTO de resposta]
```

Query de relatório vive isolada por bounded context, nunca espalhada pelos handlers — ver [[manifesto#Regras de organização]].

## Tratamento de erro

```mermaid
graph LR
    A[Erro de domínio ou infraestrutura] --> B[Mapeamento para status HTTP]
    B --> C["mensagem estruturada"]
    C --> D[Frontend traduz para mensagem amigável]
```

Stack trace vai para log estruturado, ==nunca para a resposta== — ver [[../../prd|PRD]] seção 31.
