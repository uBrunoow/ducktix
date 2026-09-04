---
title: Guidelines de Desenvolvimento
tags:
  - ducktix
  - convencoes
  - engenharia
aliases:
  - Convenções
  - Guidelines
updated: 2026-09-01
---

# Guidelines de Desenvolvimento

> [!abstract] Propósito
> Convenções obrigatórias do Ducktix. Em caso de conflito, o [[PRD]] prevalece. Princípios de produto em [[manifesto]].

## Camadas

```mermaid
graph TD
    A[Frontend Next.js] --> B[HTTP Adapter]
    B --> C[Application / Use Cases]
    C --> D[Domain]
    D --> E[Repository Port]
    E --> F[PostgreSQL Adapter]
```

> [!danger] Regra única e inegociável
> `Domain` ==nunca== conhece PostgreSQL, Drizzle, HTTP, JSON, React ou Next.js. Dependency Inversion sempre: `Domain ← Application ← Ports ← Adapters`.

| Onde vive | O quê |
|---|---|
| `src/server/<contexto>/domain/` | Entities, value objects, regras de negócio, domain errors. Sem infraestrutura. |
| `src/server/<contexto>/application/` | Use cases, commands, queries, orquestração. Chama ports, nunca SQL direto. |
| `src/server/<contexto>/ports/` | Interfaces de repositório e serviços externos. |
| `src/server/<contexto>/infrastructure/` | Implementação com Drizzle sobre Postgres. |
| `src/app/api/**/route.ts`, Server Actions, `scripts/cli.ts` | Adaptadores de entrada: parse/validação e resposta, sem regra de negócio. |
| `src/server/shared/` | Código realmente compartilhado entre bounded contexts (ex.: erros comuns, tipos de valor genéricos, client do Drizzle). Não vira `utils` genérico. |

Pergunte sempre: **"essa regra pertence a qual bounded context?"**

| Regra | Bounded Context |
|---|---|
| Usuário, organizador, participante | `identity` |
| Evento, categoria, local, publicação | `event` |
| Lote, tipo de ingresso, pedido, cupom, pagamento | `ticketing` |
| Inscrição, check-in, cancelamento | `participation` |

Estrutura concreta em [[backend/manifesto]] e [[frontend/manifesto]].

## Segurança

> [!danger] Obrigatório, sem exceção
> - SQL sempre parametrizado — query builder do Drizzle ou `sql` com placeholders. **Nunca** interpolar entrada do usuário em query (`sql.raw` é proibido com dado de usuário).
> - Credenciais de banco (`DATABASE_URL` do Neon) ficam em `.env.local`, nunca versionadas nem hardcoded. Nenhum segredo em variável `NEXT_PUBLIC_*`.
> - Autorização é implementada no backend, não apenas ocultando botão no frontend.
> - Regra de negócio crítica (ex.: "não vender ingresso de lote esgotado") vive no domínio, nunca só no frontend.
> - Route Handlers são same-origin; não expor a API a outras origens sem necessidade.
> - Autenticação pode ser simples — o foco do projeto é banco de dados, TypeScript e arquitetura, não segurança avançada.

## Erros

O backend retorna erro estruturado, sem stack trace para o usuário:

```json
{ "code": "TICKET_BATCH_SOLD_OUT", "message": "Lote de ingressos esgotado", "details": {} }
```

Erros de domínio (ex.: `TicketBatchSoldOutError`, `CheckInAlreadyDoneError`) são classes distintas dos erros de infraestrutura, e cada uma mapeia para um HTTP status apropriado no adaptador de entrada.

## Concorrência na venda de ingressos

> [!important] Ponto crítico do projeto
> `confirmOrder` deve rodar em transação (`db.transaction`) com `SELECT ... FOR UPDATE` (`.for('update')` no Drizzle) sobre a linha do lote/tipo de ingresso, garantindo que duas compras simultâneas nunca vendam o mesmo último ingresso. Explicar a estratégia em ADR-006. Ver [[fluxos#Comprar ingresso]] e [[backend/fluxos#Concorrência]].

## Transações

Todo processo de negócio que altera múltiplas tabelas usa transação explícita (`db.transaction`, com rollback ao lançar erro), por exemplo `confirmOrder` (pagamento + emissão de ingressos + atualização de estoque + status do pedido). Ver [[backend/services]].

## Modelagem e normalização

- Esquema normalizado até a 3FN: evitar redundância, dependência transitiva e atributos multivalorados.
- Tabelas associativas usadas corretamente (ex.: `event_categories`, `order_items`).
- PKs, FKs, `UNIQUE`, `CHECK` e `NOT NULL` aplicados de forma consistente.
- `JSONB` só com justificativa real — nunca para substituir relacionamento.
- Toda alteração de schema é feita via migration versionada (`drizzle-kit generate` + `migrate`), nunca via `docker-entrypoint-initdb.d` nem `db push` em produção.

## TypeScript idiomático

- `strict: true`, sem `any`; tipos derivados do schema Drizzle (`InferSelectModel`/`InferInsertModel`) em vez de duplicados à mão.
- Interfaces pequenas (ports), definidas onde são consumidas, não onde são implementadas.
- Erros explícitos como classes de domínio, verificadas com `instanceof`; sem exceção genérica para controle de fluxo.
- Dependency injection manual e simples (o use case recebe o repositório por parâmetro) — sem framework de DI.
- Drizzle como query builder tipado, sem ORM mágico (nada de lazy loading ou active record).
- Zod só na borda (parse de entrada em Route Handlers, Server Actions e CLI), nunca como regra de domínio.
- Evitar: frameworks gigantes, "repository" genérico universal, interfaces criadas sem necessidade, abstrações que só existem para "seguir DDD".

## Mocks e dados de demonstração

Seeds devem ser realistas (múltiplos eventos, organizadores, participantes, lotes, pedidos, pagamentos, check-ins, cupons) — nunca `Evento 1`, `Pessoa 1`. Ver [[backend/manifesto#Seeds]].

## Performance

Queries indexadas (`event_id`, `organizer_id`, `participant_id`, `order_id`, status, timestamps) · paginação em listagens · queries de relatório organizadas em `infrastructure/postgres/queries/`, fáceis de identificar. Em ambiente serverless, reutilizar o client do Neon — nunca abrir um pool por requisição.

## Testes

| Camada | O que testar |
|---|---|
| Domain | regras de negócio: evento sem info obrigatória, publicação inválida, venda com lote encerrado/esgotado, check-in duplicado ou de ingresso cancelado, cancelamento inválido |
| Integração | fluxos críticos: comprar ingresso, confirmar pedido, check-in, concorrência de venda |
| Relatórios | queries de relatório com múltiplas tabelas |

## Convenções de código

**Backend** — TypeScript strict em `src/server/`, um diretório por bounded context com `domain/application/ports/infrastructure`; Route Handlers, Server Actions e `scripts/cli.ts` como entrypoints; migrations versionadas com `drizzle-kit`.

**Frontend** — Next.js App Router em `src/app/`, componentes reutilizáveis, sem regra de negócio crítica no cliente.

**Commits** — mensagens claras em português, descrevendo o processo de negócio ou entidade afetada.

## Definition of Done

> [!success] Uma funcionalidade só está pronta quando
> Domínio + aplicação + infraestrutura Drizzle/Postgres + adaptador de entrada (Route Handler, Server Action ou CLI) + UI funcionam de ponta a ponta; regra de negócio testada; transação/concorrência tratada quando aplicável; documentação (`docs/`) atualizada.

## Antipadrões

> [!failure] Não faça
> Microserviços, backend separado do Next.js, regra de negócio no Route Handler, na Server Action ou no frontend, `utils`/`helpers` genérico contendo tudo, abstração que só existe para "seguir DDD" sem agregar valor.

> [!failure] Não entregue
> CRUD simples de eventos sem processos de negócio reais, relatórios de tabela única, tabelas artificiais só para aumentar a nota, venda de ingresso sem controle de concorrência.
