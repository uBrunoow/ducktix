# Fase 1 — Sistema de Gestão de Eventos, Ingressos e Participantes (Ducktix)

Disciplina: Banco de Dados II — UDESC
Equipe: Bruno Werner

---

## 1. Introdução ao Domínio de Informação

O domínio escolhido é a **gestão de eventos, ingressos e participantes** — um sistema equivalente, em complexidade, a plataformas comerciais de venda de ingressos e inscrições (ex.: Sympla, Eventbrite). O projeto, batizado **Ducktix**, cobre o ciclo completo de vida de um evento: criação, publicação, comercialização de ingressos, inscrição de participantes, emissão de ingressos, check-in no dia do evento e tratamento de cancelamentos/estornos.

O domínio foi deliberadamente explorado além do trio trivial "Evento – Participante – Ingresso", incorporando os seguintes aspectos do mundo real:

- **Organizadores**: pessoas ou entidades responsáveis por criar e publicar eventos. Um organizador pode manter múltiplos eventos ao longo do tempo.
- **Locais (venues)**: espaços físicos reutilizáveis entre diferentes eventos, com capacidade própria — necessários para eventos presenciais e híbridos, mas dispensáveis para eventos 100% online.
- **Categorias**: taxonomia reutilizável (ex.: música, tecnologia, esporte) associada a eventos em relação muitos-para-muitos, permitindo que um evento pertença a mais de uma categoria.
- **Modalidade e ciclo de publicação do evento**: um evento pode ser presencial, online ou híbrido, e transita por estados (rascunho, publicado, encerrado, cancelado), o que impacta regras de negócio como a possibilidade de venda de ingressos e de inscrição.
- **Lotes e tipos de ingresso**: a venda de ingressos não é um preço único fixo — um evento é dividido em lotes (ex.: 1º lote, 2º lote), cada lote com janela de vigência própria e um ou mais tipos de ingresso (ex.: inteira, meia, VIP), cada um com preço, quantidade total e quantidade vendida controladas.
- **Pedidos e itens de pedido**: um participante realiza um pedido, que pode conter múltiplos itens (diferentes tipos de ingresso, em diferentes quantidades), refletindo o comportamento real de compra em um carrinho.
- **Pagamentos**: cada pedido está associado a um pagamento, com método, status (pendente, aprovado, recusado, estornado) e valor, desacoplando a etapa financeira da etapa de emissão dos ingressos.
- **Cupons de desconto**: cupons com regras de validade (data), tipo e valor de desconto e limite de uso, aplicáveis a pedidos.
- **Ingressos individuais (tickets)**: cada unidade comprada dentro de um item de pedido gera um ingresso nominal e individual, vinculado a um participante específico e com status próprio (emitido, cancelado, utilizado) — permitindo, por exemplo, que uma pessoa compre 3 ingressos para 3 amigos diferentes.
- **Inscrições (registrations)**: distintas da compra de ingresso, cobrindo o caso de eventos gratuitos ou eventos que exigem apenas inscrição (sem transação financeira).
- **Check-in**: controle de entrada no evento, vinculado a um ingresso específico e à pessoa (usuário do sistema) que realizou a validação.
- **Solicitações de cancelamento**: fluxo de pós-venda, em que um pedido pode ser alvo de uma solicitação de cancelamento com motivo, status de aprovação e datas de solicitação/resolução.

Essa modelagem reflete regras de negócio reais, como: um evento publicado precisa de informações mínimas preenchidas; a quantidade vendida de um tipo de ingresso nunca pode ultrapassar a quantidade total (concorrência de venda); um ingresso só é emitido após a confirmação do pedido; e um evento encerrado não recebe novas inscrições.

---

## 2. Esquema Conceitual

### 2.1 Entidades e seus atributos principais

| Entidade | Atributos relevantes (visão conceitual) |
|---|---|
| **Usuário** | nome, e-mail, senha |
| **Organizador** | nome, documento, e-mail de contato *(especialização de Usuário)* |
| **Participante** | nome, documento, e-mail de contato *(especialização de Usuário)* |
| **Local (Venue)** | nome, endereço, cidade, capacidade |
| **Categoria** | nome |
| **Evento** | nome, descrição, modalidade, status, data/hora início, data/hora fim, capacidade |
| **Lote de Ingressos (TicketBatch)** | nome, data/hora início, data/hora fim, status |
| **Tipo de Ingresso (TicketType)** | nome, preço, quantidade total, quantidade vendida |
| **Cupom** | código, tipo de desconto, valor de desconto, validade início/fim, limite de uso, quantidade usada |
| **Pedido (Order)** | status, valor total, data de criação |
| **Item de Pedido (OrderItem)** | quantidade, preço unitário |
| **Pagamento** | método, status, valor, data de pagamento |
| **Ingresso (Ticket)** | status, data de emissão |
| **Inscrição (Registration)** | status, data de inscrição |
| **Check-in** | data/hora do check-in |
| **Solicitação de Cancelamento** | motivo, status, data de solicitação, data de resolução |

### 2.2 Diagrama Entidade-Relacionamento (notação Peter Chen / cardinalidades)

```
Usuário ──(especializa)──► Organizador
Usuário ──(especializa)──► Participante

Organizador  1 ──organiza──  N  Evento
Local        1 ──sedia────  0..N Evento          (opcional: evento online não exige local)
Evento       N ──recebe───  N  Categoria          (via associativa Evento_Categoria)

Evento       1 ──possui────  N  Lote
Lote         1 ──define────  N  TipoIngresso

Participante 1 ──realiza───  N  Pedido
Pedido       N ──contém────  N  TipoIngresso      (via associativa ItemPedido)
Pedido       1 ──gera───────  0..1 Pagamento
Pedido       0..N ──aplica──  1 Cupom

ItemPedido   1 ──emite─────  N  Ingresso
Ingresso     N ──pertence a──1  Participante      (titular do ingresso)
Ingresso     1 ──registra──  0..1 CheckIn
CheckIn      N ──realizado por── 1 Usuário         (operador do check-in)

Participante 1 ──inscreve──  N  Inscrição
Evento       1 ──recebe────  N  Inscrição

Pedido       1 ──origina──   N  SolicitaçãoCancelamento
```

### 2.3 Diagrama ER

![[Order Payment Ecosystem Flow-2026-08-28-162801.png]]

### 2.4 Observações de modelagem conceitual

- **Organizador** e **Participante** são especializações (subtipos) de **Usuário** — todo organizador e todo participante possui uma conta de acesso ao sistema (login/e-mail/senha), mas com atributos e responsabilidades distintas. Um mesmo usuário poderia, em tese, ser organizador e participante simultaneamente (especialização não exclusiva).
- **Evento ↔ Categoria** é um relacionamento muitos-para-muitos, resolvido pela entidade associativa **Evento_Categoria**.
- **Pedido ↔ TipoIngresso** é um relacionamento muitos-para-muitos (um pedido pode conter vários tipos de ingresso, em quantidades diferentes), resolvido pela entidade associativa **ItemPedido**, que carrega atributos próprios (quantidade, preço unitário no momento da compra).
- **Ingresso** é uma entidade fraca em relação a **ItemPedido**: cada unidade comprada em um item de pedido origina um ingresso individual e nominal.
- **Inscrição** representa um relacionamento N:N entre Participante e Evento, mas modelado como entidade associativa própria por carregar atributos (status, data) e por ser conceitualmente distinta da compra de ingresso (cobre eventos gratuitos/sem comercialização).
- **CheckIn** é uma entidade fraca de **Ingresso** (existência dependente: só existe check-in de um ingresso já emitido).

---

## 3. Esquema Lógico Relacional — Dicionário de Dados

O esquema lógico abaixo deriva diretamente do esquema conceitual, aplicando as regras de mapeamento ER→Relacional (entidades fortes viram tabelas, entidades fracas herdam a chave da entidade forte, relacionamentos N:N viram tabelas associativas) e está normalizado até a **3ª Forma Normal (3FN)**: não há atributos multivalorados, não há dependências parciais de chave (toda tabela possui chave primária simples — `id`) e não há dependências transitivas (todo atributo não-chave depende exclusivamente da chave primária).

Convenções gerais: toda tabela possui `id` (chave primária, UUID) e os campos de auditoria `created_at`, `updated_at` (timestamp, não exibidos nas tabelas abaixo por serem repetidos em todas as entidades). Chaves estrangeiras estão indicadas na coluna **FK**.

### 3.0 Diagrama Relacional

![[drawSQL-image-export-2026-08-28.webp]]

### 3.1 users

Conta de acesso ao sistema. Superentidade da qual `organizers` e `participants` derivam (relação 1:1 opcional).

**Relação users**

| Atributo | Domínio | Tamanho | RI | Descrição |
|---|---|---|---|---|
| id | texto (UUID) | 36 | chave primária | Identificador único do usuário |
| name | texto | 150 | não nulo | Nome completo |
| email | texto | 150 | não nulo, único | E-mail de login |
| password_hash | texto | 255 | não nulo | Hash da senha de acesso |
| created_at | data/hora | | não nulo | Data de criação do registro |
| updated_at | data/hora | | não nulo | Data da última atualização do registro |

### 3.2 organizers

Especialização de `users` responsável por criar e publicar eventos.

**Relação organizers**

| Atributo | Domínio | Tamanho | RI | Descrição |
|---|---|---|---|---|
| id | texto (UUID) | 36 | chave primária | Identificador único do organizador |
| user_id | texto (UUID) | 36 | não nulo, único, chave estrangeira para a relação users | Conta de acesso associada |
| name | texto | 150 | não nulo | Razão social / nome do organizador |
| document | texto | 20 | não nulo, único | CPF/CNPJ |
| contact_email | texto | 150 | não nulo | E-mail de contato comercial |
| created_at | data/hora | | não nulo | Data de criação do registro |
| updated_at | data/hora | | não nulo | Data da última atualização do registro |

### 3.3 participants

Especialização de `users` que realiza pedidos e se inscreve em eventos.

**Relação participants**

| Atributo | Domínio | Tamanho | RI | Descrição |
|---|---|---|---|---|
| id | texto (UUID) | 36 | chave primária | Identificador único do participante |
| user_id | texto (UUID) | 36 | não nulo, único, chave estrangeira para a relação users | Conta de acesso associada |
| name | texto | 150 | não nulo | Nome do participante |
| document | texto | 20 | não nulo, único | CPF |
| contact_email | texto | 150 | não nulo | E-mail de contato |
| created_at | data/hora | | não nulo | Data de criação do registro |
| updated_at | data/hora | | não nulo | Data da última atualização do registro |

### 3.4 venues

Local físico reutilizável entre eventos.

**Relação venues**

| Atributo | Domínio | Tamanho | RI | Descrição |
|---|---|---|---|---|
| id | texto (UUID) | 36 | chave primária | Identificador único do local |
| name | texto | 150 | não nulo | Nome do espaço |
| address | texto | 255 | não nulo | Logradouro |
| city | texto | 100 | não nulo | Cidade |
| capacity | inteiro | | não nulo, maior que zero | Capacidade máxima de público |
| created_at | data/hora | | não nulo | Data de criação do registro |
| updated_at | data/hora | | não nulo | Data da última atualização do registro |

### 3.5 categories

Taxonomia reutilizável entre eventos.

**Relação categories**

| Atributo | Domínio | Tamanho | RI | Descrição |
|---|---|---|---|---|
| id | texto (UUID) | 36 | chave primária | Identificador único da categoria |
| name | texto | 80 | não nulo, único | Nome da categoria (ex.: Música, Tecnologia) |
| created_at | data/hora | | não nulo | Data de criação do registro |
| updated_at | data/hora | | não nulo | Data da última atualização do registro |

### 3.6 events

Evento organizado, presencial/online/híbrido.

**Relação events**

| Atributo | Domínio | Tamanho | RI | Descrição |
|---|---|---|---|---|
| id | texto (UUID) | 36 | chave primária | Identificador único do evento |
| organizer_id | texto (UUID) | 36 | não nulo, chave estrangeira para a relação organizers | Organizador responsável |
| venue_id | texto (UUID) | 36 | chave estrangeira para a relação venues | Local físico (nulo se evento 100% online) |
| name | texto | 150 | não nulo | Nome do evento |
| description | texto | | | Descrição detalhada |
| modality | texto | 12 | não nulo, domínio restrito: presencial, online, hibrido | Modalidade do evento |
| status | texto | 12 | não nulo, domínio restrito: rascunho, publicado, encerrado, cancelado | Estado do ciclo de publicação |
| starts_at | data/hora | | não nulo | Data/hora de início |
| ends_at | data/hora | | não nulo, maior que starts_at | Data/hora de término |
| capacity | inteiro | | não nulo, maior que zero | Capacidade máxima de participantes |
| created_at | data/hora | | não nulo | Data de criação do registro |
| updated_at | data/hora | | não nulo | Data da última atualização do registro |

### 3.7 event_categories

Tabela associativa entre `events` e `categories` (N:N).

**Relação event_categories**

| Atributo | Domínio | Tamanho | RI | Descrição |
|---|---|---|---|---|
| id | texto (UUID) | 36 | chave primária | Identificador único do vínculo |
| event_id | texto (UUID) | 36 | não nulo, chave estrangeira para a relação events | Evento classificado |
| category_id | texto (UUID) | 36 | não nulo, chave estrangeira para a relação categories | Categoria atribuída |
| created_at | data/hora | | não nulo | Data de criação do registro |
| updated_at | data/hora | | não nulo | Data da última atualização do registro |
| — | — | — | único (event_id, category_id) | Evita duplicidade de classificação |

### 3.8 ticket_batches

Lote de venda de ingressos de um evento.

**Relação ticket_batches**

| Atributo | Domínio | Tamanho | RI | Descrição |
|---|---|---|---|---|
| id | texto (UUID) | 36 | chave primária | Identificador único do lote |
| event_id | texto (UUID) | 36 | não nulo, chave estrangeira para a relação events | Evento ao qual o lote pertence |
| name | texto | 80 | não nulo | Nome do lote (ex.: "1º Lote") |
| starts_at | data/hora | | não nulo | Início da vigência de venda |
| ends_at | data/hora | | não nulo, maior que starts_at | Fim da vigência de venda |
| status | texto | 12 | não nulo, domínio restrito: fechado, aberto, esgotado, encerrado | Situação atual do lote |
| created_at | data/hora | | não nulo | Data de criação do registro |
| updated_at | data/hora | | não nulo | Data da última atualização do registro |

### 3.9 ticket_types

Tipo/categoria de ingresso vendido dentro de um lote.

**Relação ticket_types**

| Atributo | Domínio | Tamanho | RI | Descrição |
|---|---|---|---|---|
| id | texto (UUID) | 36 | chave primária | Identificador único do tipo de ingresso |
| ticket_batch_id | texto (UUID) | 36 | não nulo, chave estrangeira para a relação ticket_batches | Lote ao qual pertence |
| name | texto | 80 | não nulo | Nome (ex.: Inteira, Meia, VIP) |
| price | numérico | 10,2 | não nulo, maior ou igual a zero | Preço unitário |
| quantity_total | inteiro | | não nulo, maior que zero | Quantidade total disponível |
| quantity_sold | inteiro | | não nulo, valor padrão 0, entre 0 e quantity_total | Quantidade já vendida |
| created_at | data/hora | | não nulo | Data de criação do registro |
| updated_at | data/hora | | não nulo | Data da última atualização do registro |

### 3.10 coupons

Cupom de desconto aplicável a pedidos.

**Relação coupons**

| Atributo | Domínio | Tamanho | RI | Descrição |
|---|---|---|---|---|
| id | texto (UUID) | 36 | chave primária | Identificador único do cupom |
| code | texto | 30 | não nulo, único | Código do cupom |
| discount_type | texto | 12 | não nulo, domínio restrito: percentual, valor_fixo | Tipo de desconto |
| discount_value | numérico | 10,2 | não nulo, maior que zero | Valor/percentual do desconto |
| valid_from | data/hora | | não nulo | Início da validade |
| valid_until | data/hora | | não nulo, maior que valid_from | Fim da validade |
| usage_limit | inteiro | | não nulo, maior que zero | Limite máximo de usos |
| usage_count | inteiro | | não nulo, valor padrão 0, entre 0 e usage_limit | Quantidade de vezes já utilizado |
| created_at | data/hora | | não nulo | Data de criação do registro |
| updated_at | data/hora | | não nulo | Data da última atualização do registro |

### 3.11 orders

Pedido realizado por um participante.

**Relação orders**

| Atributo | Domínio | Tamanho | RI | Descrição |
|---|---|---|---|---|
| id | texto (UUID) | 36 | chave primária | Identificador único do pedido |
| participant_id | texto (UUID) | 36 | não nulo, chave estrangeira para a relação participants | Participante que realizou o pedido |
| coupon_id | texto (UUID) | 36 | chave estrangeira para a relação coupons | Cupom aplicado (se houver) |
| status | texto | 12 | não nulo, domínio restrito: pendente, confirmado, cancelado | Situação do pedido |
| total_amount | numérico | 10,2 | não nulo, maior ou igual a zero | Valor total do pedido |
| created_at | data/hora | | não nulo | Data de criação do pedido |
| updated_at | data/hora | | não nulo | Data da última atualização do registro |

### 3.12 order_items

Tabela associativa entre `orders` e `ticket_types` (N:N), com atributos próprios — item de um pedido.

**Relação order_items**

| Atributo | Domínio | Tamanho | RI | Descrição |
|---|---|---|---|---|
| id | texto (UUID) | 36 | chave primária | Identificador único do item |
| order_id | texto (UUID) | 36 | não nulo, chave estrangeira para a relação orders | Pedido ao qual pertence |
| ticket_type_id | texto (UUID) | 36 | não nulo, chave estrangeira para a relação ticket_types | Tipo de ingresso comprado |
| quantity | inteiro | | não nulo, maior que zero | Quantidade adquirida |
| unit_price | numérico | 10,2 | não nulo, maior ou igual a zero | Preço unitário no momento da compra |
| created_at | data/hora | | não nulo | Data de criação do registro |
| updated_at | data/hora | | não nulo | Data da última atualização do registro |

### 3.13 tickets

Ingresso individual e nominal, gerado a partir de um item de pedido.

**Relação tickets**

| Atributo | Domínio | Tamanho | RI | Descrição |
|---|---|---|---|---|
| id | texto (UUID) | 36 | chave primária | Identificador único do ingresso |
| order_item_id | texto (UUID) | 36 | não nulo, chave estrangeira para a relação order_items | Item de pedido que originou o ingresso |
| participant_id | texto (UUID) | 36 | não nulo, chave estrangeira para a relação participants | Titular nominal do ingresso |
| status | texto | 12 | não nulo, domínio restrito: emitido, cancelado, utilizado | Situação do ingresso |
| issued_at | data/hora | | | Data/hora de emissão |
| created_at | data/hora | | não nulo | Data de criação do registro |
| updated_at | data/hora | | não nulo | Data da última atualização do registro |

### 3.14 payments

Pagamento associado a um pedido.

**Relação payments**

| Atributo | Domínio | Tamanho | RI | Descrição |
|---|---|---|---|---|
| id | texto (UUID) | 36 | chave primária | Identificador único do pagamento |
| order_id | texto (UUID) | 36 | não nulo, único, chave estrangeira para a relação orders | Pedido pago |
| method | texto | 20 | não nulo, domínio restrito: cartao, pix, boleto | Meio de pagamento |
| status | texto | 12 | não nulo, domínio restrito: pendente, aprovado, recusado, estornado | Situação do pagamento |
| amount | numérico | 10,2 | não nulo, maior ou igual a zero | Valor pago |
| paid_at | data/hora | | | Data/hora da confirmação do pagamento |
| created_at | data/hora | | não nulo | Data de criação do registro |
| updated_at | data/hora | | não nulo | Data da última atualização do registro |

### 3.15 registrations

Tabela associativa entre `participants` e `events` (N:N) — inscrição, distinta da compra de ingresso.

**Relação registrations**

| Atributo | Domínio | Tamanho | RI | Descrição |
|---|---|---|---|---|
| id | texto (UUID) | 36 | chave primária | Identificador único da inscrição |
| participant_id | texto (UUID) | 36 | não nulo, chave estrangeira para a relação participants | Participante inscrito |
| event_id | texto (UUID) | 36 | não nulo, chave estrangeira para a relação events | Evento de destino |
| status | texto | 10 | não nulo, domínio restrito: ativa, cancelada | Situação da inscrição |
| registered_at | data/hora | | não nulo | Data da inscrição |
| created_at | data/hora | | não nulo | Data de criação do registro |
| updated_at | data/hora | | não nulo | Data da última atualização do registro |
| — | — | — | único (participant_id, event_id) | Um participante só se inscreve uma vez por evento |

### 3.16 check_ins

Entidade fraca de `tickets` — registro de entrada no evento.

**Relação check_ins**

| Atributo | Domínio | Tamanho | RI | Descrição |
|---|---|---|---|---|
| id | texto (UUID) | 36 | chave primária | Identificador único do check-in |
| ticket_id | texto (UUID) | 36 | não nulo, único, chave estrangeira para a relação tickets | Ingresso validado |
| performed_by | texto (UUID) | 36 | não nulo, chave estrangeira para a relação users | Usuário (operador) que realizou o check-in |
| checked_in_at | data/hora | | não nulo | Data/hora do check-in |
| created_at | data/hora | | não nulo | Data de criação do registro |
| updated_at | data/hora | | não nulo | Data da última atualização do registro |

### 3.17 cancellation_requests

Solicitação de cancelamento de um pedido.

**Relação cancellation_requests**

| Atributo | Domínio | Tamanho | RI | Descrição |
|---|---|---|---|---|
| id | texto (UUID) | 36 | chave primária | Identificador único da solicitação |
| order_id | texto (UUID) | 36 | não nulo, chave estrangeira para a relação orders | Pedido alvo da solicitação |
| reason | texto | | não nulo | Motivo do cancelamento |
| status | texto | 12 | não nulo, domínio restrito: solicitado, aprovado, negado | Situação da solicitação |
| requested_at | data/hora | | não nulo | Data da solicitação |
| resolved_at | data/hora | | | Data da resolução (aprovação/negação) |
| created_at | data/hora | | não nulo | Data de criação do registro |
| updated_at | data/hora | | não nulo | Data da última atualização do registro |

### 3.18 Resumo das tabelas de entidade vs. associativas

| Tipo | Tabelas |
|---|---|
| **Entidade** (CRUD completo) | users, organizers, participants, venues, categories, events, ticket_batches, ticket_types, coupons, tickets, payments |
| **Associativa** (processo de negócio) | event_categories, orders, order_items, registrations, check_ins, cancellation_requests |

---

## 4. Repositório do Projeto

*(Link do repositório contendo código-fonte, backup do banco e instruções de execução a ser inserido aqui — item 2 da entrega.)*
