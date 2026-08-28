# PROMPT MESTRE — PROJETO FINAL DE BANCO DE DADOS

## Sistema de Gestão de Eventos, Ingressos e Participantes

Você é um **Software Architect + Senior Full Stack (TypeScript) Developer + Database Architect + Professor de Engenharia de Software**.

Sua tarefa é projetar e implementar um projeto acadêmico completo para a disciplina de Banco de Dados.

O projeto será desenvolvido inicialmente utilizando **PostgreSQL** e deverá posteriormente estar preparado conceitualmente para uma possível adaptação para banco **NoSQL** na Fase 2 da disciplina.

O objetivo secundário do projeto é servir como projeto de aprendizado de **TypeScript full stack com Next.js**, portanto priorize código idiomático em TypeScript, simplicidade, clareza, separação de responsabilidades e boas práticas, evitando abstrações desnecessariamente complexas.

**Restrição de infraestrutura (decisão de projeto):** o projeto NÃO deve depender de um servidor de backend dedicado (ex.: Go, Node standalone, containers em Render/Railway/AWS/EC2/etc.). Todo o backend deve rodar dentro do próprio Next.js (API Routes / Route Handlers / Server Actions), de forma que o único deploy necessário seja o **Next.js na Vercel** (free tier), falando diretamente com um **PostgreSQL hospedado no Neon** (free tier, serverless Postgres). O acesso ao banco deve ser feito via **Drizzle ORM** (`drizzle-orm` + `drizzle-kit` para migrations), usando o driver serverless do Neon (`@neondatabase/serverless`) para funcionar bem em ambiente serverless/edge da Vercel. Isso elimina custo e complexidade de manter um servidor ou banco separado no ar.

---

# 1. CONTEXTO ACADÊMICO

O trabalho exige:

1. Definição e exploração de um domínio de informação.
2. Esquema conceitual.
3. Esquema lógico relacional.
4. Dicionário de dados.
5. Banco de dados relacional funcional.
6. Dados previamente inseridos.
7. Aplicação que utilize e manipule o banco.
8. CRUD para todas as tabelas de entidade.
9. Operações de processos de negócio para todas as tabelas associativas.
10. Pelo menos 3 relatórios.
11. Código-fonte.
12. Backup do banco.
13. Instruções de compilação e execução.
14. Interface final da aplicação.

A aplicação deve utilizar um banco de dados relacional.

A professora permite interface gráfica ou interface em modo texto.

**REST isoladamente não pode ser considerado a interface final da aplicação.**

Portanto, a lógica de acesso via HTTP (API Routes/Route Handlers do Next.js) deve ser tratada como um **adaptador de entrada da aplicação**, e a interface final deverá ser o frontend web Next.js (App Router).

Como mecanismo adicional de segurança acadêmica, implemente também um pequeno **script CLI** (rodado localmente com `tsx`/`node`, reutilizando os mesmos casos de uso da aplicação) para operações essenciais, permitindo demonstrar que a aplicação pode ser utilizada sem depender exclusivamente da interface web.

---

# 2. DOMÍNIO

O domínio escolhido será:

# Sistema de Gestão de Eventos, Ingressos e Participantes

O sistema deverá permitir administrar o ciclo completo de criação, publicação, venda, inscrição e participação em eventos.

O domínio NÃO deve ser simplificado para apenas:

```text
Evento
Participante
Ingresso
```

O professor avaliará positivamente a exploração adequada do domínio.

O sistema deverá representar situações reais de uma plataforma de eventos.

Exemplos:

* eventos presenciais;
* eventos online;
* eventos híbridos;
* organizadores;
* locais;
* categorias;
* edições de eventos;
* tipos de ingressos;
* lotes;
* pedidos;
* participantes;
* inscrições;
* pagamentos;
* check-in;
* cupons;
* cancelamentos;
* status;
* capacidade;
* relatórios.

Não criar funcionalidades fictícias apenas para aumentar a quantidade de tabelas.

Cada entidade deve possuir justificativa de negócio.

---

# 3. PRINCÍPIO ARQUITETURAL

Utilize:

# DDD (lite) + Arquitetura em Camadas + Monólito Full Stack em Next.js

NÃO implementar microserviços. NÃO implementar um backend separado.

O projeto deve ser um **monólito full stack**: um único projeto Next.js (App Router) contém frontend, backend (via Route Handlers e/ou Server Actions) e a camada de acesso ao banco, todos deployados juntos como uma aplicação serverless.

A arquitetura deve utilizar, de forma pragmática (sem framework de DI pesado, sem excesso de camadas), os conceitos de:

* Domain-Driven Design (linguagem ubíqua, bounded contexts como pastas/módulos);
* Entities e Value Objects (como tipos/classes TypeScript) quando fizer sentido;
* Aggregates conceituais (consistência transacional agrupada);
* Domain Services quando necessário (funções puras de regra de negócio);
* Repository Ports (interfaces TypeScript) + implementação concreta com o driver Postgres;
* Application Services / Use Cases (funções que orquestram regra de negócio + repositórios);
* Adapters de entrada: Route Handlers (`app/api/**/route.ts`), Server Actions e o script CLI;
* Dependency Inversion (o domínio depende de interfaces, não do driver Postgres diretamente);
* Separation of Concerns entre domínio, aplicação e infraestrutura, mesmo dentro de um único processo Next.js.

A prioridade é:

```text
Domain (regras puras)
    ↓
Application (use cases)
    ↓
Ports (interfaces de repositório)
    ↓
Adapters (Postgres, Route Handlers, Server Actions, CLI, componentes React)
```

O domínio (regras de negócio puras) não pode conhecer detalhes de Next.js (`Request`/`Response`, React, cache do framework) nem do driver SQL diretamente — ele depende apenas de interfaces (ports) definidas em TypeScript.

---

# 4. BOUNDED CONTEXTS

Organize o domínio em módulos/bounded contexts dentro do projeto Next.js (ex.: `src/server/<contexto>/`).

Uma sugestão inicial:

```text
src/server/
├── event/
├── ticketing/
├── participation/
├── identity/
└── shared/
```

Entretanto, antes de implementar, analise o domínio e determine se essa divisão realmente faz sentido.

Sugestão:

## Identity / Users

Responsável por:

* usuários;
* perfis;
* dados básicos de usuários;
* organizadores;
* participantes.

Não criar autenticação extremamente sofisticada (ex.: usar Auth.js/NextAuth com credenciais simples, ou até uma sessão básica). O objetivo principal do trabalho é banco de dados e o full stack em TypeScript.

---

## Event Management

Responsável por:

* eventos;
* categorias;
* locais;
* modalidades;
* publicação;
* status do evento;
* período do evento;
* capacidade;
* organizador.

Exemplos de regras:

* evento precisa possuir organizador;
* evento pode possuir local;
* evento online não precisa necessariamente de local físico;
* evento publicado precisa estar com informações mínimas preenchidas;
* evento encerrado não pode receber novas inscrições.

---

## Ticketing

Responsável por:

* tipos de ingresso;
* lotes;
* preços;
* disponibilidade;
* pedidos;
* itens do pedido;
* cupons;
* pagamentos;
* cancelamentos.

Exemplos:

```text
Evento
   ↓
Lote
   ↓
Tipo de ingresso
```

e:

```text
Participante
    ↓
Pedido
    ↓
Item do Pedido
    ↓
Ingresso
```

---

## Participation

Responsável por:

* inscrições;
* ingressos emitidos;
* participantes;
* check-in;
* presença;
* status de participação.

Exemplos:

```text
Participante
      ↓
Inscrição
      ↓
Evento
```

e:

```text
Ingresso
    ↓
Check-in
```

---

# 5. BANCO DE DADOS

Utilizar:

**PostgreSQL**

Para desenvolvimento local, executar PostgreSQL utilizando Docker Compose (junto com pgAdmin, opcional).

Para o ambiente "no ar" (demonstração/deploy), utilizar o **Neon** (PostgreSQL serverless, free tier), acessado via connection string, para que o Next.js na Vercel não dependa de infraestrutura própria de banco.

Estrutura mínima local:

```text
docker-compose.yml

services:
  postgres:
    ...

  pgadmin:
    ...
```

Utilizar volume persistente localmente.

As credenciais devem ser configuradas através de variáveis de ambiente (`.env.local` localmente, environment variables no provedor do deploy).

Nunca colocar senhas reais diretamente no código.

---

# 6. MODELAGEM DO BANCO

A modelagem deve ser normalizada.

Objetivo:

* 1FN;
* 2FN;
* 3FN;
* evitar redundâncias;
* evitar dependências transitivas;
* evitar atributos multivalorados;
* evitar colunas que armazenem listas;
* utilizar tabelas associativas corretamente;
* utilizar PKs e FKs;
* utilizar UNIQUE quando necessário;
* utilizar CHECK constraints quando fizer sentido;
* utilizar NOT NULL corretamente.

Não utilizar JSONB para substituir relacionamentos relacionais.

JSONB somente deve ser utilizado quando houver uma justificativa real.

---

# 7. ENTIDADES

Faça uma análise inicial e proponha um modelo rico.

Uma possível lista inicial é:

### Identity

* users
* organizers
* participants

### Event

* events
* event_categories
* categories
* venues

### Ticketing

* ticket_batches
* ticket_types
* orders
* order_items
* tickets
* coupons
* payments

### Participation

* registrations
* check_ins
* cancellation_requests

Essa lista NÃO é obrigatória.

Antes de implementar, analise:

1. quais são entidades;
2. quais são relacionamentos;
3. quais são tabelas associativas;
4. quais são apenas atributos;
5. quais representam processos de negócio.

Não criar tabelas artificialmente apenas para aumentar a nota.

---

# 8. PROCESSOS DE NEGÓCIO

Este ponto é extremamente importante.

O professor exige:

> Operações de processos de negócio para todas as tabelas associativas.

Portanto, não basta fazer CRUD em tabelas associativas.

Cada relacionamento relevante deve possuir uma operação de negócio (implementada como uma função de use case em TypeScript, chamada tanto pelos Route Handlers/Server Actions quanto pelo script CLI).

Exemplos:

## Criar evento

```text
createEvent()
```

## Publicar evento

```text
publishEvent()
```

## Criar lote de ingressos

```text
createTicketBatch()
```

## Abrir lote

```text
openTicketBatch()
```

## Comprar ingresso

```text
createOrder()
addTicketToOrder()
confirmOrder()
```

## Emitir ingresso

```text
issueTicket()
```

## Inscrever participante

```text
registerParticipant()
```

## Cancelar inscrição

```text
cancelRegistration()
```

## Realizar check-in

```text
checkInParticipant()
```

## Cancelar pedido

```text
cancelOrder()
```

## Aplicar cupom

```text
applyCoupon()
```

Cada processo deve possuir regras de negócio reais.

Exemplo:

```text
checkInParticipant(ticketID)
```

deve verificar:

* ingresso existe;
* ingresso pertence ao evento;
* ingresso está válido;
* ingresso não foi cancelado;
* ingresso ainda não foi utilizado;
* evento está acontecendo ou permite check-in;
* participante está associado ao ingresso.

Não implementar processos de negócio como simples INSERTs.

---

# 9. CRUD

A aplicação deverá possuir CRUD completo para todas as entidades principais.

Para cada entidade:

### Create

Cadastrar.

### Read

Consultar um registro.

Consultar lista.

Consultar com filtros quando fizer sentido.

### Update

Atualizar.

### Delete

Excluir ou aplicar soft delete quando houver justificativa de negócio.

Não aplicar soft delete automaticamente em todas as tabelas.

Explique a decisão.

---

# 10. RELATÓRIOS

Implementar no mínimo 3 relatórios.

Os relatórios devem envolver múltiplas tabelas.

Não criar relatórios artificiais que consultem apenas uma tabela.

Implementar pelo menos:

## Relatório 1 — Eventos e participantes

Filtros:

* período;
* evento;
* categoria.

Mostrar:

* evento;
* organizador;
* quantidade de inscritos;
* quantidade de presentes;
* capacidade;
* percentual de ocupação.

---

## Relatório 2 — Vendas de ingressos

Filtros:

* período;
* evento;
* lote.

Mostrar:

* evento;
* lote;
* tipo de ingresso;
* quantidade vendida;
* valor unitário;
* receita;
* status dos pedidos.

---

## Relatório 3 — Check-in e presença

Filtros:

* evento;
* período.

Mostrar:

* participante;
* evento;
* ingresso;
* horário de check-in;
* status da participação.

---

# 11. RELATÓRIOS ADICIONAIS

Se fizer sentido, implementar também:

* eventos com maior número de participantes;
* receita por evento;
* taxa de ocupação dos eventos;
* ingressos mais vendidos;
* vendas por categoria;
* participantes que compraram mais de um ingresso;
* quantidade de cancelamentos;
* taxa de comparecimento;
* desempenho de cupons.

---

# 12. TRANSAÇÕES

Utilizar transações PostgreSQL quando um processo de negócio alterar múltiplas tabelas.

Por exemplo:

```text
confirmOrder()
```

pode envolver:

```text
BEGIN

validar pedido

validar disponibilidade

registrar pagamento

emitir ingressos

atualizar estoque

alterar status do pedido

COMMIT
```

Em caso de erro:

```text
ROLLBACK
```

Na prática em TypeScript, isso significa usar a API de transação do Drizzle (`db.transaction(async (tx) => { ... })`), executando todas as queries do use case através do `tx` dentro do callback, nunca depender de múltiplas queries "soltas" fora de uma transação para uma mesma operação de negócio. O Drizzle cuida do `BEGIN`/`COMMIT`/`ROLLBACK` internamente.

Demonstrar claramente no código onde as transações são necessárias.

---

# 13. CONCORRÊNCIA

Prestar atenção especial à venda de ingressos.

Evitar que duas compras simultâneas vendam o mesmo último ingresso.

Implementar uma estratégia adequada utilizando PostgreSQL, mesmo em ambiente serverless (onde cada requisição pode abrir sua própria conexão via pool):

* transação;
* row-level locking;
* `SELECT ... FOR UPDATE`;
* atualização atômica (`UPDATE ... WHERE quantidade_disponivel > 0`);
* constraints (ex.: `CHECK (quantidade_disponivel >= 0)`).

Explique a estratégia utilizada.

Esse é um ponto importante para demonstrar domínio de banco de dados.

---

# 14. TYPESCRIPT / NODE

Utilizar:

**TypeScript** (mesma linguagem do frontend e do backend, dentro do Next.js).

Priorizar TypeScript idiomático e tipado (`strict: true`).

Utilizar:

* tipos explícitos para entidades de domínio e DTOs;
* funções puras para regras de domínio;
* erros de domínio como classes/tipos customizados (`class DomainError extends Error`), nunca `throw "string"`;
* injeção de dependência simples (passar repositórios como parâmetro/factory), sem container de DI;
* módulos pequenos e coesos por bounded context;
* testes unitários (ex.: Vitest) para as regras de domínio;
* testes de integração quando fizer sentido (ex.: contra um Postgres de teste via Docker/Testcontainers).

Evitar:

* frameworks de backend adicionais (Express, Nest) — o próprio Next.js já cobre a camada HTTP;
* ORMs pesados/opacos que escondam completamente o SQL (ex.: TypeORM) — o Drizzle é aceito justamente por ser "SQL-like" e manter as queries explícitas e tipadas;
* abstrações genéricas ("repository" universal, "service" universal) sem necessidade real;
* lógica de negócio dentro de componentes React ou dentro dos Route Handlers.

---

# 15. BANCO EM TYPESCRIPT

Utilizar:

```text
Drizzle ORM (drizzle-orm)
```

para comunicação com PostgreSQL, combinado com o driver serverless do Neon:

```text
@neondatabase/serverless
```

O Drizzle é usado como um "SQL-like" query builder tipado (schema definido em TypeScript, queries próximas do SQL real), não como um ORM opaco — os relacionamentos e joins continuam explícitos no código, o que é importante para o projeto demonstrar domínio real de SQL/modelagem relacional.

Utilizar migrations com:

```text
Drizzle Kit (drizzle-kit)
```

gerando migrations a partir do schema TypeScript (`drizzle-kit generate`) e aplicando-as (`drizzle-kit migrate`).

Toda alteração de schema deve ser feita através de migration do Drizzle Kit, nunca alterando o banco manualmente.

Nunca depender exclusivamente de um script `docker-entrypoint-initdb.d` para estruturar o banco em produção.

---

# 16. SQL

As queries devem ser explícitas e legíveis.

Evitar ORMs pesados/opacos (Prisma completo, TypeORM etc.) para que o projeto demonstre conhecimento real de SQL — o Drizzle é aceito porque seu query builder é "SQL-like": o SQL gerado deve continuar sendo o foco, não uma abstração que esconde os relacionamentos.

As queries complexas dos relatórios devem estar organizadas e fáceis de identificar.

Exemplo:

```text
src/server/
  ticketing/
    infrastructure/
      postgres/
        order-repository.ts
        ticket-repository.ts
        schema.ts
```

Utilizar sempre queries parametrizadas — o Drizzle já parametriza automaticamente, mas se algum SQL cru for necessário (`sql` template tag do Drizzle), nunca concatenar entrada do usuário diretamente na query.

---

# 17. ESTRUTURA DO PROJETO

Criar uma estrutura semelhante a (Next.js App Router, monólito full stack):

```text
event-platform/
│
├── src/
│   ├── app/
│   │   ├── (site)/
│   │   │   ├── dashboard/
│   │   │   ├── events/
│   │   │   ├── ticket-batches/
│   │   │   ├── tickets/
│   │   │   ├── participants/
│   │   │   ├── orders/
│   │   │   ├── check-ins/
│   │   │   └── reports/
│   │   │
│   │   └── api/
│   │       ├── events/
│   │       ├── orders/
│   │       ├── tickets/
│   │       └── reports/
│   │
│   ├── server/
│   │   ├── identity/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── ports/
│   │   │   └── infrastructure/
│   │   │
│   │   ├── event/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── ports/
│   │   │   └── infrastructure/
│   │   │
│   │   ├── ticketing/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── ports/
│   │   │   └── infrastructure/
│   │   │
│   │   ├── participation/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── ports/
│   │   │   └── infrastructure/
│   │   │
│   │   └── shared/
│   │       └── db/
│   │           ├── client.ts
│   │           └── schema.ts
│   │
│   └── components/
│
├── migrations/
│
├── seeds/
│
├── docs/
│
├── scripts/
│   └── cli.ts
│
├── tests/
│
├── docker-compose.yml
├── Makefile
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

A estrutura acima é uma sugestão.

Faça ajustes quando houver justificativa arquitetural.

---

# 18. CAMADAS (DDD LITE)

Dentro de cada bounded context (em `src/server/<contexto>/`):

```text
domain
```

deve conter:

* entities/tipos;
* value objects;
* domain rules (funções puras de validação);
* domain errors;
* domain services quando realmente necessários.

```text
application
```

deve conter:

* use cases (funções que recebem dependências via parâmetro e orquestram o domínio + repositórios);
* commands/queries (tipos de entrada);
* DTOs de aplicação;
* orchestration, incluindo abertura/commit/rollback de transação.

```text
ports
```

deve conter:

* interfaces de repositório;
* interfaces de serviços externos, se houver.

```text
infrastructure
```

deve conter:

* implementação concreta dos repositórios com Drizzle ORM (PostgreSQL/Neon);
* qualquer outro adapter de infraestrutura do contexto.

A regra fundamental:

```text
Domain NÃO depende de Next.js, de React nem do driver Postgres diretamente.
```

Os Route Handlers, Server Actions, páginas React e o script CLI (em `src/app/` e `scripts/`) são todos **adapters de entrada** que chamam os use cases de `application/`.

---

# 19. API (ROUTE HANDLERS)

Criar endpoints HTTP usando **Route Handlers do Next.js** (`src/app/api/**/route.ts`), usados principalmente por Server/Client Components que precisam de fetch client-side (ex.: tabelas com filtro, relatórios) — quando uma página puder ler os dados diretamente via Server Component chamando o use case, prefira isso a criar uma API própria.

Exemplo:

```text
POST   /api/events
GET    /api/events
GET    /api/events/:id
PUT    /api/events/:id
DELETE /api/events/:id

POST   /api/events/:id/publish

POST   /api/events/:id/ticket-batches

POST   /api/orders

POST   /api/orders/:id/confirm

POST   /api/tickets/:id/check-in

GET    /api/reports/events
GET    /api/reports/sales
GET    /api/reports/check-ins
```

Não colocar regra de negócio nos handlers.

O handler deve apenas:

```text
HTTP request (Route Handler)
      ↓
parse/validação de entrada (ex.: Zod)
      ↓
application use case
      ↓
response (JSON)
```

---

# 20. FRONTEND (NEXT.JS)

Utilizar:

* Next.js (App Router);
* TypeScript;
* React (Server Components por padrão; Client Components apenas onde há interatividade real);
* componentes reutilizáveis.

O frontend será a **interface gráfica final da aplicação**.

Não considerar a API interna (Route Handlers) como interface final — ela é apenas um detalhe de implementação usado por partes interativas da própria UI.

Prefira, sempre que possível, que páginas de listagem/detalhe leiam dados diretamente via **Server Components** chamando os use cases (sem round-trip HTTP interno), e use Server Actions para mutações simples de formulário (criar evento, publicar evento etc.). Reserve os Route Handlers de `src/app/api` para casos que realmente precisem de fetch client-side (ex.: filtros dinâmicos de relatório, autocomplete).

Criar uma interface administrativa simples, funcional e suficiente para demonstração.

Páginas mínimas:

```text
/dashboard

/events
/events/new
/events/:id
/events/:id/edit

/ticket-batches

/tickets

/participants

/orders

/check-ins

/reports/events
/reports/sales
/reports/check-ins
```

Não é necessário criar um design extremamente sofisticado.

Priorizar:

* usabilidade;
* funcionamento;
* clareza;
* demonstração das funcionalidades acadêmicas.

---

# 21. CLI

Criar também um pequeno script CLI em TypeScript (`scripts/cli.ts`, executado localmente com `tsx scripts/cli.ts` ou `npm run cli`).

Ele deve permitir demonstrar algumas operações sem depender da interface web, reutilizando diretamente os use cases de `src/server/**/application`.

Exemplo:

```text
Event Management CLI

1 - Eventos
2 - Participantes
3 - Ingressos
4 - Pedidos
5 - Check-in
6 - Relatórios
0 - Sair
```

A CLI deve reutilizar os mesmos use cases utilizados pelas páginas/Route Handlers.

Não duplicar regra de negócio.

---

# 22. FRONTEND/API NÃO SÃO DOMÍNIO

Nunca fazer, em um Route Handler, Server Action ou componente:

```text
Handler / Component
    ↓
SQL
```

Nem:

```text
Handler / Component
    ↓
Repository
```

O fluxo deve ser sempre:

```text
Adapter (Route Handler, Server Action, Server Component, CLI)
      ↓
Application Use Case
      ↓
Domain
      ↓
Repository Port
      ↓
PostgreSQL Adapter (infrastructure)
```

Exemplo do que evitar:

A validação:

```text
"não pode vender ingresso quando o lote acabou"
```

deve existir no domínio/use case (`src/server/ticketing/**`), nunca apenas no componente React ou apenas checada no client antes do submit.

O frontend pode fazer validações de UX (ex.: desabilitar botão), mas nunca ser a única camada responsável pela regra.

---

# 23. DATABASE DESIGN

Antes de implementar o código, produza:

## DER

Diagrama Entidade-Relacionamento.

Utilizar uma ferramenta que permita exportar o diagrama.

Pode utilizar Mermaid, dbdiagram ou outra ferramenta apropriada.

O DER deverá mostrar:

* entidades;
* atributos relevantes;
* PK;
* FK;
* cardinalidades;
* relacionamentos.

---

# 24. ESQUEMA LÓGICO

Produzir o esquema lógico relacional.

Exemplo:

```text
USERS(
    id PK,
    name,
    email UNIQUE,
    created_at,
    updated_at
)
```

E assim por diante para todas as tabelas.

---

# 25. DICIONÁRIO DE DADOS

Criar documentação detalhada.

Para cada tabela:

```text
Tabela: events

Campo       Tipo          PK  FK  Null  Descrição
---------------------------------------------------------
id          UUID          SIM NÃO NÃO   Identificador
name        VARCHAR(200)  NÃO NÃO NÃO   Nome do evento
...
```

Para cada campo informar:

* nome;
* tipo;
* tamanho quando aplicável;
* PK;
* FK;
* NULL/NOT NULL;
* UNIQUE;
* DEFAULT;
* CHECK;
* descrição;
* regra de negócio quando aplicável.

---

# 26. DOCUMENTAÇÃO

Criar:

```text
docs/
```

Com:

```text
docs/
├── domain.md
├── architecture.md
├── conceptual-model.md
├── logical-model.md
├── data-dictionary.md
├── business-processes.md
├── reports.md
└── database.md
```

---

# 27. DOCUMENTO ACADÊMICO

Criar um documento principal:

```text
docs/fase-1.md
```

Esse documento deverá conter:

# 1. Introdução

Explicar o domínio.

# 2. Problema

Explicar qual problema o sistema resolve.

# 3. Objetivos

Objetivo geral e objetivos específicos.

# 4. Domínio de informação

Explicar:

* eventos;
* organizadores;
* participantes;
* ingressos;
* vendas;
* pagamentos;
* inscrições;
* check-in.

# 5. Regras de negócio

Listar as principais regras.

# 6. Esquema conceitual

Inserir o DER.

# 7. Esquema lógico

Apresentar todas as relações.

# 8. Dicionário de dados

Apresentar todas as tabelas.

# 9. Arquitetura

Explicar:

* DDD lite;
* bounded contexts;
* camadas (domain/application/ports/infrastructure);
* monólito full stack em Next.js (sem backend separado);
* PostgreSQL;
* TypeScript.

# 10. Processos de negócio

Explicar os principais casos de uso.

# 11. Relatórios

Explicar os pelo menos 3 relatórios.

# 12. Execução

Explicar como executar (local e como acessar a versão deployada).

# 13. Conclusão

Explicar resultados e possíveis evoluções.

---

# 28. DADOS DE SEED

O banco deve possuir dados previamente inseridos.

Não utilizar apenas:

```text
Evento 1
Evento 2
Pessoa 1
Pessoa 2
```

Criar dados coerentes e realistas.

Criar pelo menos:

* 3 categorias;
* 5 organizadores;
* 10 participantes;
* 5 locais;
* 8 eventos;
* múltiplos lotes;
* múltiplos tipos de ingresso;
* múltiplos pedidos;
* ingressos vendidos;
* pagamentos;
* inscrições;
* check-ins;
* cancelamentos;
* cupons.

Os dados devem permitir demonstrar os relatórios.

---

# 29. TESTES

Criar testes unitários (ex.: Vitest) para as regras de domínio mais importantes.

Exemplos:

```text
não permitir evento sem informações obrigatórias

não permitir publicação de evento inválido

não permitir venda quando lote encerrado

não permitir venda quando ingressos esgotados

não permitir check-in duplicado

não permitir check-in de ingresso cancelado

não permitir cancelamento inválido
```

Criar testes de integração para os fluxos críticos quando possível (ex.: contra um Postgres local via Docker).

---

# 30. OBSERVABILIDADE E ERROS

Implementar:

* logging estruturado ou organizado (ex.: `console.error` padronizado ou uma lib leve como `pino`);
* erros de domínio (classes customizadas);
* erros de infraestrutura tratados nos repositórios/adapters;
* tratamento adequado de status HTTP nos Route Handlers;
* mensagens de erro úteis para o usuário.

Não retornar stack traces para o usuário.

---

# 31. CONFIGURAÇÃO

Utilizar environment variables:

```text
DATABASE_URL
```

(string de conexão única do Postgres fornecida pelo Neon — evita ter que gerenciar host/port/user/password separados em produção).

Criar:

```text
.env.example
```

Nunca versionar:

```text
.env.local
```

---

# 32. DOCKER (APENAS DESENVOLVIMENTO LOCAL)

Criar:

```text
docker-compose.yml
```

com:

```text
postgres
pgadmin (opcional)
```

usado **somente em desenvolvimento local** — o deploy final não usa Docker, usa a Vercel (Next.js) + o Neon (Postgres serverless).

Deve ser possível executar:

```bash
docker compose up -d
```

e subir a infraestrutura local para desenvolvimento/testes.

---

# 33. SCRIPTS (package.json)

Criar scripts npm equivalentes ao antigo Makefile:

```text
npm run dev        # sobe o Next.js em modo desenvolvimento
npm run db:up      # docker compose up -d (postgres local)
npm run db:down    # docker compose down
npm run migrate    # aplica migrations
npm run seed       # popula dados de exemplo
npm run build      # build de produção
npm run start      # roda o build de produção
npm run test       # testes unitários/integração
npm run lint       # lint
npm run cli        # roda o script CLI (tsx scripts/cli.ts)
npm run backup     # gera backup do Postgres local
```

Adaptar os comandos conforme a implementação real.

---

# 34. BACKUP

Criar mecanismo/documentação para gerar backup do PostgreSQL (tanto local quanto do banco gerenciado usado no deploy).

Exemplo:

```text
backup/
event-platform.sql
```

O backup deverá permitir reconstruir o banco.

Documentar como restaurar:

```bash
psql ...
```

ou ferramenta equivalente (ex.: `pg_dump`/`pg_restore`, ou o mecanismo de backup/branching do provedor gerenciado, se houver).

---

# 35. README

Criar README completo.

Deve conter:

## Requisitos

* Docker e Docker Compose (apenas para desenvolvimento local);
* Node.js;
* npm/pnpm.

## Instalação

## Configuração

## Banco (local e provedor gerenciado usado no deploy)

## Migrations

## Seed

## Execução da aplicação (dev e produção)

## Execução da CLI

## Testes

## Backup

## Arquitetura

## Estrutura do projeto

## Deploy (Vercel + Postgres gerenciado)

## Credenciais de demonstração, se existirem

---

# 36. SEGURANÇA BÁSICA

Implementar pelo menos:

* SQL parametrizado;
* validação de entrada (ex.: Zod nos Route Handlers/Server Actions);
* senha/configuração fora do código (environment variables);
* limites razoáveis (ex.: paginação, tamanho de payload);
* tratamento de erros sem vazar detalhes internos.

Autenticação completa é opcional.

Não deixar autenticação consumir a maior parte do projeto, pois o objetivo principal é demonstrar:

```text
Banco de Dados
+
TypeScript / Next.js
+
DDD lite
+
Arquitetura em camadas
+
Processos de Negócio
```

---

# 37. REGRAS DE CÓDIGO

O código deve ser:

* idiomático;
* simples;
* legível;
* testável;
* modular;
* coeso.

Evitar:

* código mágico;
* funções gigantes;
* abstrações genéricas sem necessidade;
* interfaces com dezenas de métodos;
* `utils` genérico contendo tudo;
* `helpers` genérico contendo tudo;
* lógica SQL espalhada pelo sistema;
* regras de negócio em componentes React ou Route Handlers.

---

# 38. DECISÕES ARQUITETURAIS

Antes de implementar, produzir um documento:

```text
docs/architecture-decisions.md
```

Explicando decisões como:

### ADR-001

Por que monólito full stack em Next.js em vez de backend separado (Go/Node/etc.) + frontend?

### ADR-002

Por que camadas domain/application/ports/infrastructure em vez de "Clean Architecture" genérica?

### ADR-003

Por que PostgreSQL?

### ADR-004

Por que Drizzle ORM em vez de um ORM opaco (Prisma/TypeORM) ou SQL cru puro?

### ADR-005

Por que DDD lite/bounded contexts organizados por pasta em vez de módulos separados de verdade?

### ADR-006

Como funciona o controle de concorrência na venda de ingressos em um ambiente serverless?

### ADR-007

Por que hospedar tudo na Vercel (Next.js) + Neon (Postgres serverless), sem servidor dedicado?

---

# 39. PREPARAÇÃO PARA FASE 2

A Fase 2 deverá adaptar o sistema para NoSQL.

Portanto, não criar uma camada de acesso a dados fortemente acoplada ao PostgreSQL.

O domínio e os casos de uso devem depender de interfaces/ports.

Exemplo:

```text
Application
     ↓
Repository Port
     ↓
PostgreSQL Adapter
```

Posteriormente:

```text
Application
     ↓
Repository Port
     ↓
MongoDB Adapter
```

A aplicação não deve precisar reescrever as regras de negócio para trocar o banco.

Porém, NÃO implementar MongoDB agora.

A Fase 1 deve permanecer focada em PostgreSQL.

---

# 40. ENTREGÁVEIS

Ao finalizar, o projeto deverá possuir:

```text
event-platform/

├── aplicação full stack Next.js (frontend + backend integrados)
├── PostgreSQL
├── docker-compose (uso local)
├── migrations
├── seeds
├── backup
├── testes
├── documentação
├── DER
├── esquema lógico
├── dicionário de dados
├── relatórios
├── package.json com scripts (dev/migrate/seed/test/build/cli/backup)
├── README
├── .env.example
└── deploy na Vercel + Neon (Postgres serverless)
```

---

# 41. CRITÉRIO FUNDAMENTAL

Não implemente apenas "um CRUD de eventos".

O projeto precisa demonstrar um **domínio de eventos suficientemente explorado**.

A banca/professora deve conseguir observar:

```text
Entidades
     ↓
Relacionamentos
     ↓
Processos de negócio
     ↓
Transações
     ↓
Regras de negócio
     ↓
Relatórios
```

O banco deve ser parte fundamental do sistema.

---

# 42. ORDEM DE IMPLEMENTAÇÃO

Não tente gerar tudo de uma vez.

Execute o projeto em fases.

## FASE A — Discovery

Primeiro:

1. analisar o domínio;
2. identificar entidades;
3. identificar relacionamentos;
4. identificar processos;
5. identificar regras;
6. identificar bounded contexts;
7. propor modelo conceitual.

Neste momento NÃO implementar código.

Apresente o modelo para revisão.

---

## FASE B — Modelagem

Depois:

1. criar DER;
2. criar esquema lógico;
3. validar normalização;
4. criar dicionário de dados;
5. identificar PKs/FKs;
6. definir constraints;
7. definir índices;
8. definir estratégia de concorrência.

---

## FASE C — Infraestrutura

Depois:

1. projeto Next.js (TypeScript, App Router);
2. Docker Compose (Postgres local + pgAdmin opcional);
3. provisionar Neon (Postgres serverless) para o deploy;
4. migrations;
5. seeds;
6. backup.

---

## FASE D — Backend (dentro do Next.js)

Implementar nesta ordem:

```text
Domain
↓
Application
↓
Ports
↓
PostgreSQL adapters (infrastructure)
↓
Route Handlers / Server Actions
↓
CLI
```

Implementar primeiro um bounded context completo antes de iniciar todos simultaneamente.

---

## FASE E — Frontend

Depois:

1. layout;
2. dashboard;
3. eventos;
4. participantes;
5. ingressos;
6. pedidos;
7. check-in;
8. relatórios.

---

## FASE F — Testes

Depois:

1. testes unitários;
2. testes de integração;
3. testes dos processos;
4. testes dos relatórios;
5. testes de concorrência da venda.

---

## FASE G — Documentação e Deploy

Finalmente:

1. README;
2. arquitetura;
3. DER;
4. esquema lógico;
5. dicionário;
6. regras;
7. relatórios;
8. backup;
9. instruções de execução;
10. ADRs;
11. deploy na Vercel + Postgres gerenciado.

---

# 43. MODO DE TRABALHO DA IA

Você NÃO deve simplesmente gerar milhares de arquivos de uma vez.

Trabalhe incrementalmente.

Em cada fase:

1. explique brevemente a decisão;
2. apresente a estrutura;
3. implemente;
4. execute/verifique testes;
5. revise inconsistências;
6. somente depois avance.

Sempre que detectar uma decisão arquitetural questionável, explique o problema antes de implementar.

Priorize soluções simples.

Se uma abstração existir apenas para "seguir DDD", mas não agregar valor real, não utilize.

---

# 44. OBJETIVO PEDAGÓGICO

Este projeto também é um projeto de aprendizado de TypeScript full stack com Next.js.

Portanto, ao implementar cada parte importante, explique brevemente:

* por que essa estrutura foi escolhida;
* qual conceito de TypeScript/Next.js está sendo utilizado (ex.: Server Components, Server Actions, Route Handlers);
* como as interfaces (ports) funcionam naquele ponto;
* como os erros são tratados;
* como as dependências são injetadas (sem container de DI);
* como as transações são controladas com `pg`.

Não transformar a implementação em um tutorial gigante.

As explicações devem ser curtas e práticas.

---

# 45. RESULTADO ESPERADO

Ao terminar, eu quero possuir um projeto acadêmico que possa ser apresentado demonstrando:

### Banco de Dados

```text
PostgreSQL
↓
Modelo relacional normalizado
↓
Constraints
↓
Índices
↓
Transações
↓
Queries
↓
Relatórios
```

### Aplicação (Next.js full stack)

```text
TypeScript
↓
DDD lite
↓
Camadas (domain/application/ports/infrastructure)
↓
Monólito full stack (sem backend separado)
↓
Use Cases
↓
Repositories
↓
Route Handlers / Server Actions
↓
CLI
```

### Frontend

```text
Next.js
↓
Interface gráfica
↓
CRUD
↓
Processos de negócio
↓
Relatórios
```

### Infraestrutura

```text
Local: Docker Compose (PostgreSQL + pgAdmin)
Deploy: Vercel (Next.js) + Neon (Postgres serverless), sem servidor dedicado
```

### Documentação

```text
Introdução
DER
Esquema lógico
Dicionário de dados
Regras de negócio
Arquitetura
Relatórios
Instruções
Backup
```

---

# 46. PRIMEIRA TAREFA

Comece SOMENTE pela fase de Discovery.

Não escreva código ainda.

Faça uma análise profunda do domínio **Sistema de Gestão de Eventos, Ingressos e Participantes** e entregue:

1. descrição do domínio;
2. atores do sistema;
3. principais processos;
4. entidades candidatas;
5. relacionamentos;
6. tabelas associativas candidatas;
7. regras de negócio;
8. possíveis bounded contexts;
9. aggregates candidatos;
10. proposta inicial do modelo conceitual;
11. proposta inicial do esquema lógico;
12. pelo menos 3 relatórios;
13. pontos de atenção de normalização;
14. pontos de atenção de concorrência (considerando ambiente serverless);
15. justificativa para DDD lite + camadas + monólito full stack em Next.js;
16. estrutura inicial de diretórios.

NÃO implemente ainda:

* código TypeScript;
* Next.js;
* Docker;
* SQL migrations.

Primeiro quero revisar a modelagem e a arquitetura.

Depois da aprovação, avançaremos para a implementação incremental.
