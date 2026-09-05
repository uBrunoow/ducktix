---
title: Plano de migração gradual do Ducktix para NoSQL
tags:
  - ducktix
  - arquitetura
  - nosql
  - migração
  - banco-de-dados
aliases:
  - Migração NoSQL
  - Estratégia híbrida SQL e NoSQL
updated: 2026-09-05
---

# Plano de migração gradual do Ducktix para NoSQL

## 1. Objetivo

Este documento define a estratégia para introduzir NoSQL no Ducktix sem perder
o modelo relacional, as regras de negócio, os dados existentes ou a capacidade
de rollback.

A migração deve ser **incremental e híbrida**:

- PostgreSQL continua como fonte de verdade para operações transacionais.
- NoSQL começa como armazenamento de projeções e leituras otimizadas.
- O domínio e os casos de uso continuam independentes de tecnologia.
- Cada etapa precisa ser reversível e observável.
- Nenhuma tabela, migration, backup ou regra SQL existente deve ser removida
  durante a primeira fase.

O objetivo inicial não é substituir o PostgreSQL por completo, mas avaliar NoSQL
em fluxos onde documentos desnormalizados e leituras por agregado trazem
benefício claro.

## 2. Estado atual e restrições

O Ducktix usa Next.js 15, TypeScript strict, Drizzle ORM e PostgreSQL 16. O
backend está organizado por bounded contexts em `src/server/`, com camadas de
domínio, aplicação, ports e infraestrutura.

Os contextos principais são:

- `identity`: usuários, organizadores e participantes;
- `event`: eventos, categorias e publicação;
- `ticketing`: lotes, pedidos, pagamentos e cupons;
- `participation`: inscrições, ingressos e check-in;
- `shared`: contratos e infraestrutura compartilhada.

O modelo relacional vigente está documentado em `docs/modelo-logico.md` e no DDL
`db/schema.sql`. O estado funcional está em `docs/estado-atual.md`.

Restrições que permanecem válidas na migração:

- Dinheiro continua armazenado em centavos inteiros.
- Cupons continuam vinculados explicitamente a eventos.
- Um pedido continua agrupando os ingressos comprados.
- Preço e nome relevantes para uma compra devem ser preservados como snapshot.
- Lote com vendas não pode ser editado nem excluído.
- O controle concorrente de vagas não pode depender de consistência eventual.
- Dados de autenticação e credenciais nunca devem ser copiados para documentos
  públicos.
- `.env.local`, tokens e credenciais não podem ser versionados.

## 3. Decisão arquitetural

### 3.1 Fonte de verdade

Durante a primeira etapa, o PostgreSQL será a fonte de verdade para:

- usuários e autenticação;
- criação e alteração de eventos;
- lotes, vagas e contadores de venda;
- pedidos, itens e pagamentos;
- cupons, limites de uso e aplicações;
- emissão de ingressos;
- inscrições e alterações que afetem capacidade;
- operações de check-in que precisem de unicidade forte.

O NoSQL será usado inicialmente para:

- documentos públicos de eventos;
- catálogo e filtros de eventos publicados;
- histórico e timeline de alterações;
- projeções específicas para leitura;
- eventualmente, uma projeção operacional de check-in após validação.

### 3.2 Camada anticorrupção

Nenhum caso de uso deve depender diretamente de um SDK NoSQL. A aplicação deve
depender de ports, com implementações concretas em infraestrutura:

```text
src/server/
  event/
    ports/
      event-repository.ts
      event-read-model.ts
    infrastructure/
      postgres/
      nosql/
  shared/
    infrastructure/
      outbox/
      nosql/
```

Quando um contrato existente representar uma operação transacional, sua
implementação inicial continua sendo PostgreSQL. Para consultas públicas, pode
ser criado um contrato separado de read model:

```ts
interface PublishedEventReadModel {
  findBySlug(slug: string): Promise<PublishedEventView | null>;
  search(criteria: EventSearchCriteria): Promise<PublishedEventSummary[]>;
}
```

Implementações previstas:

```text
PostgresPublishedEventReadModel
NoSqlPublishedEventReadModel
```

A troca de implementação deve ocorrer por configuração ou composição no adapter
de entrada, nunca dentro das regras de domínio.

## 4. Modelo NoSQL inicial

O banco NoSQL deve ser escolhido na implementação com base em custo, ambiente de
deploy e necessidade de consultas. Este plano não pressupõe MongoDB, DynamoDB
ou outro produto específico; a abstração deve esconder essa decisão.

O modelo lógico abaixo é independente do fornecedor.

### 4.1 Documento de evento público

Coleção ou partição lógica: `event_publications`.

Chave principal recomendada: `eventId`.

```json
{
  "eventId": "uuid",
  "slug": "evento-exemplo",
  "organizer": {
    "id": "uuid",
    "displayName": "Organizador"
  },
  "name": "Nome do evento",
  "descriptionHtml": "HTML sanitizado",
  "modality": "presencial",
  "location": "Joinville · SC",
  "onlineFormat": null,
  "status": "publicado",
  "visibility": "publico",
  "startsAt": "2026-10-01T18:00:00Z",
  "endsAt": "2026-10-01T22:00:00Z",
  "imageUrl": "https://...",
  "categories": [
    {
      "id": "uuid",
      "name": "Tecnologia",
      "slug": "tecnologia"
    }
  ],
  "ticketBatches": [
    {
      "id": "uuid",
      "name": "Lote 1",
      "priceInCents": 5000,
      "availableQuantity": 40,
      "salesEndsAt": "2026-09-30T23:59:59Z",
      "displayOrder": 0
    }
  ],
  "projectionVersion": 1,
  "sourceUpdatedAt": "2026-09-05T12:00:00Z",
  "projectedAt": "2026-09-05T12:00:02Z"
}
```

Regras do documento:

- Somente eventos publicados e visíveis podem aparecer no catálogo público.
- `availableQuantity` é uma projeção, não autorização para vender.
- A venda deve consultar e atualizar o PostgreSQL até existir uma estratégia
  transacional NoSQL validada.
- A descrição deve ser a versão sanitizada já usada pela aplicação.
- O documento pode conter dados duplicados de organizador, categorias e lotes
  porque é uma projeção de leitura.
- O documento deve ser substituível de forma idempotente.

### 4.2 Resumo para catálogo

Caso o volume de eventos torne o documento completo inadequado para buscas,
criar uma projeção separada `event_catalog`:

```json
{
  "eventId": "uuid",
  "slug": "evento-exemplo",
  "name": "Nome do evento",
  "imageUrl": "https://...",
  "modality": "online",
  "startsAt": "2026-10-01T18:00:00Z",
  "categories": ["tecnologia"],
  "organizerName": "Organizador",
  "status": "publicado",
  "visibility": "publico",
  "searchText": "nome do evento tecnologia organizador",
  "sourceUpdatedAt": "2026-09-05T12:00:00Z"
}
```

Essa projeção só deve ser criada se os requisitos de busca não forem atendidos
adequadamente pela coleção de eventos públicos.

### 4.3 Pedido e ingresso

Pedidos não devem ser migrados para NoSQL como primeira etapa. Eles podem
receber uma projeção futura para a tela de “Meus ingressos”, mas o pedido
transacional continua no PostgreSQL.

Quando necessário, a projeção pode ter o formato:

```json
{
  "orderId": "uuid",
  "buyerId": "uuid",
  "status": "confirmado",
  "createdAt": "2026-09-05T12:00:00Z",
  "totalInCents": 10000,
  "eventGroups": [
    {
      "eventId": "uuid",
      "eventName": "Evento",
      "eventSlug": "evento",
      "tickets": [
        {
          "ticketId": "uuid",
          "participantName": "Participante",
          "ticketName": "Lote 1",
          "unitPriceInCents": 5000,
          "status": "emitido",
          "qrCodeReference": "opaque-reference"
        }
      ]
    }
  ],
  "sourceUpdatedAt": "2026-09-05T12:00:00Z",
  "projectedAt": "2026-09-05T12:00:02Z"
}
```

Não copiar senha, token de sessão, CPF completo ou dados de cobrança para uma
projeção de leitura sem necessidade explícita e revisão de segurança.

### 4.4 Histórico de eventos

Para auditoria e reprocessamento, criar uma outbox no PostgreSQL e,
opcionalmente, uma coleção NoSQL de eventos de integração:

```json
{
  "eventId": "uuid",
  "eventType": "EventPublished",
  "aggregateType": "event",
  "aggregateId": "uuid",
  "occurredAt": "2026-09-05T12:00:00Z",
  "payloadVersion": 1,
  "payload": {
    "eventId": "uuid",
    "sourceUpdatedAt": "2026-09-05T12:00:00Z"
  }
}
```

O payload deve conter apenas os dados necessários para reconstruir a projeção.
Nunca publicar segredo ou credencial.

## 5. Sincronização com Transactional Outbox

A sincronização deve evitar o padrão inseguro de atualizar PostgreSQL e NoSQL em
chamadas independentes sem registro de falha.

### 5.1 Tabela de outbox

Adicionar uma migration SQL para uma tabela semelhante a:

```text
outbox_event
- id UUID PK
- aggregate_type VARCHAR NOT NULL
- aggregate_id UUID NOT NULL
- event_type VARCHAR NOT NULL
- payload JSONB NOT NULL
- payload_version INTEGER NOT NULL
- occurred_at TIMESTAMPTZ NOT NULL
- available_at TIMESTAMPTZ NOT NULL
- processed_at TIMESTAMPTZ NULL
- attempts INTEGER NOT NULL DEFAULT 0
- last_error TEXT NULL
```

Índices mínimos:

- `(processed_at, available_at)` para buscar eventos pendentes;
- `(aggregate_type, aggregate_id, occurred_at)` para ordenação e
  reprocessamento.

A alteração do agregado e a inserção da outbox devem ocorrer na mesma transação
PostgreSQL:

```text
BEGIN
  atualizar evento
  inserir outbox_event
COMMIT
```

### 5.2 Consumidor da outbox

O processador deve:

1. Buscar um lote pequeno de eventos pendentes.
2. Reservar os eventos de forma segura para evitar processamento concorrente.
3. Construir ou atualizar a projeção NoSQL.
4. Repetir a operação com segurança se houver retry.
5. Marcar o evento como processado somente após sucesso.
6. Incrementar tentativas e registrar o erro em caso de falha.
7. Expor métricas ou logs com atraso, falhas e quantidade pendente.

A entrega deve ser **at-least-once**. Portanto, os handlers precisam ser
idempotentes.

### 5.3 Ordenação e versões

Eventos do mesmo agregado devem ser aplicados em ordem ou protegidos por
`sourceUpdatedAt`/versão monotônica. Um evento atrasado não pode sobrescrever
uma projeção mais nova.

A projeção deve rejeitar ou ignorar uma atualização quando `sourceUpdatedAt`
for anterior ao valor já armazenado, salvo em um fluxo explícito de rebuild.

### 5.4 Exclusão e cancelamento

Exclusão lógica ou mudança de status deve gerar uma nova projeção com o estado
final. Exclusões físicas no NoSQL só devem ocorrer quando:

- o agregado tiver sido removido de forma intencional;
- a retenção e auditoria permitirem a remoção;
- a operação for idempotente;
- existir procedimento de rebuild a partir do SQL.

## 6. Fases de implementação

### Fase 0 — Preparação e contrato

Entregáveis:

- confirmar o fornecedor NoSQL e suas limitações de consulta;
- mapear as consultas reais das páginas públicas e do organizador;
- definir os ports de read model;
- registrar invariantes que não podem ser relaxadas;
- documentar configuração e ambientes sem incluir segredos;
- criar estratégia de feature flag para leitura NoSQL.

Critério de saída: contratos, consultas e decisão de fornecedor aprovados antes
de alterar fluxo de produção.

### Fase 1 — Outbox no PostgreSQL

Entregáveis:

- schema Drizzle da outbox;
- migration correspondente;
- função ou serviço para registrar eventos na mesma transação do agregado;
- índices e política de retry;
- logs estruturados de falha.

Critério de saída: uma alteração de evento gera exatamente um registro de
integração recuperável na mesma transação.

### Fase 2 — Projeção de eventos

Entregáveis:

- adapter NoSQL isolado em infraestrutura;
- mapper de `evento`, `categoria`, `organizador` e `lote` para o documento
  público;
- projector idempotente;
- tratamento de publicação, edição, cancelamento e exclusão;
- comando de rebuild completo a partir do PostgreSQL.

Critério de saída: a projeção de um evento pode ser criada, atualizada,
repetida e reconstruída sem duplicação ou perda de dados.

### Fase 3 — Carga inicial e validação

Entregáveis:

- rotina de backfill dos eventos vigentes;
- comparação automatizada SQL × NoSQL;
- relatório de divergências por `eventId`;
- sincronização da outbox habilitada após o backfill;
- janela de observação antes da troca de leitura.

Critério de saída: contagens, identificadores, status, datas, categorias, lotes e
valores projetados são compatíveis dentro das diferenças documentadas.

### Fase 4 — Dual read e troca da leitura pública

Entregáveis:

- leitura NoSQL atrás de feature flag;
- fallback temporário para PostgreSQL quando a projeção estiver ausente ou
  inválida;
- telemetria de fallback e divergência;
- ativação gradual por ambiente;
- plano de rollback para voltar a ler do PostgreSQL.

Critério de saída: catálogo e detalhe público funcionam com NoSQL sem alterar
venda, reserva ou checkout.

### Fase 5 — Novas projeções seletivas

Avaliar somente após a Fase 4:

- projeção de “Meus ingressos” por pedido;
- projeção de check-in para leitura rápida;
- timeline de alterações de evento;
- consultas administrativas específicas.

Cada nova projeção deve ter uma consulta-alvo, contrato, fonte de verdade,
estratégia de consistência, política de retenção e procedimento de rebuild.

### Fase 6 — Avaliação de migração transacional

Não iniciar automaticamente. Fazer uma análise separada para pedidos, estoque,
cupons e pagamentos.

A migração transacional só pode avançar se houver solução comprovada para:

- reserva e decremento concorrente de vagas;
- unicidade e idempotência de pagamento;
- limites de cupom;
- consistência entre pedido, item e ingresso;
- recuperação após falha parcial;
- auditoria e relatórios;
- backup, restore e observabilidade equivalentes.

## 7. Estratégia de dados e mapeamento

| PostgreSQL | Projeção NoSQL inicial | Tratamento |
|---|---|---|
| `evento` | `event_publications` | Documento principal |
| `organizador` | campo resumido `organizer` | Desnormalização controlada |
| `categoria` + `evento_categoria` | array `categories` | Embutido para leitura |
| `lote` | array `ticketBatches` | Embutido, com quantidade projetada |
| `pedido` | não migrar inicialmente | Permanece transacional |
| `item_pedido` | futura projeção de pedido | Snapshot preservado |
| `pagamento` | não migrar inicialmente | Dados sensíveis/transacionais |
| `cupom` | não migrar inicialmente | Regra e contador permanecem no SQL |
| `inscricao` | futura projeção por evento | Avaliar após eventos |
| `ingresso` | futura projeção de meus ingressos | Sem substituir fonte SQL |
| `check-in` | futura projeção operacional | Só após validação de unicidade |
| `outbox_event` | eventos de integração opcionais | Retenção e reprocessamento |

## 8. Consistência, concorrência e segurança

### Consistência

- Leituras públicas podem aceitar consistência eventual curta.
- Checkout, reserva, pagamento, cupom e emissão de ingresso exigem PostgreSQL.
- A interface não deve afirmar que uma venda foi concluída usando apenas uma
  projeção NoSQL.
- O atraso da projeção deve ser mensurável.

### Concorrência

- `availableQuantity` nunca autoriza sozinho a venda.
- O decremento de vagas permanece protegido pela transação SQL e pelas
  invariantes atuais.
- Processadores concorrentes devem usar lock ou reserva compatível com o
  PostgreSQL e com o fornecedor NoSQL.
- Retries não podem duplicar ingressos, usos de cupom ou eventos projetados.

### Segurança

- Não copiar `senha_hash`, tokens de redefinição, sessão ou credenciais.
- Minimizar CPF/CNPJ, endereço de cobrança e dados profissionais nas
  projeções.
- Separar documentos públicos de documentos autenticados por usuário.
- Aplicar controle de acesso no adapter NoSQL e nas rotinas de rebuild.
- Registrar falhas sem incluir dados sensíveis no log.

## 9. Observabilidade e operação

A implementação deve acompanhar, no mínimo:

- quantidade de eventos pendentes na outbox;
- idade do evento pendente mais antigo;
- taxa de sucesso e falha do projector;
- quantidade de retries;
- tempo entre `occurredAt` e `projectedAt`;
- quantidade de fallback NoSQL → PostgreSQL;
- divergências encontradas na validação;
- último rebuild executado e seu resultado.

Operações obrigatórias:

- executar backfill inicial;
- reconstruir um evento específico;
- reconstruir uma coleção inteira;
- reprocessar eventos com erro;
- consultar divergências;
- desativar a leitura NoSQL via feature flag;
- restaurar leitura exclusivamente do PostgreSQL.

## 10. Testes e validação

### Testes unitários

- mapper SQL → documento NoSQL;
- regras de inclusão e exclusão de eventos públicos;
- idempotência do projector;
- rejeição de versões antigas;
- serialização de centavos e timestamps;
- ausência de campos sensíveis.

### Testes de integração

- alteração de evento e outbox na mesma transação;
- retry após falha do NoSQL;
- processamento duplicado do mesmo evento;
- rebuild depois de apagar a projeção;
- evento cancelado removido do catálogo público;
- atualização de lote refletida na projeção sem permitir venda pelo NoSQL.

### Testes de contrato

- `NoSqlPublishedEventReadModel` e `PostgresPublishedEventReadModel` devem
  retornar o mesmo formato de `PublishedEventView`;
- consultas com evento ausente, rascunho, cancelado, não listado e sem lotes
  devem ter comportamento documentado;
- ordenação e filtros devem ser equivalentes ou ter diferenças explicitamente
  registradas.

### Validação antes de ativar

- comparar dados por `eventId`;
- comparar contagens por status e visibilidade;
- comparar slug, datas, modalidade, categorias e lotes;
- confirmar que vendas continuam passando pelo PostgreSQL;
- executar rollback da feature flag em ambiente de teste;
- medir atraso da projeção em condições normais e após indisponibilidade do
  NoSQL.

## 11. Rollback

O rollback deve ser operacional, não uma restauração destrutiva de banco.

1. Desativar a feature flag da leitura NoSQL.
2. Voltar a usar o read model PostgreSQL.
3. Manter a outbox e os eventos pendentes para investigação ou reprocessamento.
4. Corrigir o projector ou o adapter.
5. Reexecutar backfill ou eventos pendentes.
6. Comparar novamente SQL e NoSQL antes de reativar.

Não remover dados do PostgreSQL como parte do rollout NoSQL. A primeira
migração não deve depender de rollback de schema destrutivo.

## 12. Checklist para o futuro pedido de implementação

Quando a implementação for solicitada, executar na ordem:

- [ ] Confirmar fornecedor NoSQL, região, limites e estratégia de autenticação.
- [ ] Ler `docs/estado-atual.md`, `docs/modelo-logico.md` e `db/schema.sql`.
- [ ] Mapear os ports e adapters existentes antes de criar novos contratos.
- [ ] Definir configuração segura e atualizar `.env.example`, sem tocar em
      `.env.local`.
- [ ] Criar schema e migration da outbox.
- [ ] Implementar publicação de eventos na mesma transação do PostgreSQL.
- [ ] Implementar adapter NoSQL e projector idempotente.
- [ ] Implementar backfill e rebuild.
- [ ] Implementar comparação SQL × NoSQL.
- [ ] Adicionar feature flag de leitura.
- [ ] Ativar dual read apenas em ambiente controlado.
- [ ] Executar testes unitários, integração e contrato.
- [ ] Executar `pnpm exec tsc --noEmit` e `git diff --check`.
- [ ] Documentar fornecedor, variáveis de ambiente, operação e rollback.

## 13. Critérios de conclusão da primeira migração

A primeira migração será considerada concluída quando:

- PostgreSQL continuar sendo a fonte transacional dos fluxos de venda;
- a projeção pública de eventos puder ser reconstruída integralmente a partir
  do SQL;
- o projector for idempotente e tolerar retries;
- alterações de evento forem sincronizadas por outbox transacional;
- divergências forem detectáveis e corrigíveis;
- a leitura pública puder alternar entre SQL e NoSQL por feature flag;
- o rollback para PostgreSQL não exigir perda de dados;
- documentação, configuração, testes e operação estiverem atualizados;
- nenhuma regra de domínio tiver sido acoplada ao fornecedor NoSQL.

## 14. Primeiro escopo recomendado

O primeiro pedido de implementação deve limitar-se a:

1. outbox transacional no PostgreSQL;
2. adapter do fornecedor NoSQL escolhido;
3. projeção `event_publications`;
4. backfill e rebuild;
5. comparação SQL × NoSQL;
6. read model público atrás de feature flag.

Pedidos, pagamentos, cupons, estoque de lotes e emissão de ingressos devem
permanecer fora desse primeiro escopo.
