# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmado pelo usuário (2026-09-01): monólito full stack **Next.js (App Router)** em TypeScript strict, backend dentro do próprio Next (Route Handlers / Server Actions), **PostgreSQL no Neon** acessado via **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`, driver `@neondatabase/serverless`), deploy único na **Vercel** (free tier). Tailwind CSS no frontend. Sem servidor de backend dedicado, sem containers de produção.

> Nota (2026-09-03): os docs de `ducktix/docs/` já foram alinhados ao stack Next.js/Drizzle — o aviso anterior sobre uma API em Go estava ele próprio desatualizado. O único documento superado é `ducktix/docs/backend/entidades.md`, que descreve o modelo de dados **previsto antes da implementação**; ele já traz um aviso apontando para o modelo vigente (`docs/modelo-conceitual.md`, `docs/modelo-logico.md`, `docs/modelo-mudancas.md`).

## Users

- **Organizador (usuário primário).** Opera o back-office: cria e publica eventos, define locais, categorias, tipos de ingresso e lotes, acompanha pedidos, pagamentos e cupons, confere ocupação e receita, e faz check-in. Trabalha sentado, em desktop, com muitos registros na tela e necessidade de escanear listas e relatórios rapidamente.
- **Participante público.** Descobre eventos, escolhe ingresso, compra e se inscreve. Confirmado como segunda face do produto: existe um fluxo público de descoberta e compra, não apenas operações feitas pelo operador.
- **Avaliadora (professora da disciplina).** Não é usuária do produto, mas é quem julga a entrega em defesa ao vivo. O sistema precisa expor CRUDs, processos de negócio e relatórios de forma demonstrável.

## Product Purpose

Ducktix administra o ciclo completo de eventos: criação, publicação, venda de ingressos, inscrição, pagamento, check-in e relatórios — para eventos presenciais, online e híbridos. Sucesso é o organizador conseguir levar um evento do rascunho ao relatório de presença sem inconsistência de dados, e o participante conseguir comprar um ingresso e chegar ao check-in.

## Positioning

Não é "um CRUD de eventos". O diferencial declarado é a exploração completa do domínio: entidades com justificativa de negócio, tabelas associativas com processos de negócio explícitos (não só CRUD), consistência transacional na venda de ingressos (transação + travamento de linha, para nunca vender o mesmo ingresso duas vezes) e relatórios que cruzam múltiplas tabelas.

## Operating Context

- Trabalho acadêmico da disciplina de Banco de Dados (UDESC), Fase 1 (relacional); a Fase 2 adapta para NoSQL.
- Entrega no Moodle e **defesa ao vivo em 2026-09-24 às 19h00**; domínio já reservado (prazo 2026-09-10). Ausência na defesa zera o trabalho.
- Entregáveis obrigatórios: documento com introdução do domínio + esquema conceitual + dicionário de dados; repositório público com código-fonte, backup do banco e instruções de compilação/execução, sem arquivos compactados e sem alterações após a defesa.
- Exigências funcionais da disciplina: CRUD de **todas** as tabelas de entidade, processo de negócio para **todas** as tabelas associativas, e no mínimo **3 relatórios** envolvendo associação de mais de uma tabela, sobre um banco com dados previamente inseridos.
- REST sozinho não conta como interface final: a interface final é o frontend Next.js; a API é adaptador de entrada. Um script CLI (`tsx`/`node`) reutilizando os mesmos casos de uso existe como garantia adicional.
- Simplificar o domínio é penalizado na nota.

## Capabilities and Constraints

Bounded contexts e capacidades previstas (nenhuma implementada até 2026-09-01 — o repositório contém apenas documentação, moodboards e diagramas):

- **Identity:** cadastro e autenticação básica, perfis de organizador e participante, CRUD de ambos.
- **Eventos:** CRUD de eventos (presencial/online/híbrido), publicação com validação de campos mínimos, encerramento, capacidade, CRUD de categorias e de locais.
- **Ticketing:** tipos de ingresso, lotes (criação/abertura), pedidos e itens, confirmação com emissão de ingresso, cancelamento, cupons, pagamentos, controle de concorrência na venda.
- **Participation:** inscrição, cancelamento de inscrição, check-in com validação do ingresso, status de participação.
- **Relatórios:** eventos e participantes (inscritos, presentes, ocupação); vendas de ingressos (quantidade, receita, status); check-in e presença.
- **Plataforma:** migrations versionadas (nunca init scripts), seeds realistas, backup/restore do Postgres, CLI mínima.

Restrições arquiteturais: DDD lite + camadas, monólito modular por bounded context, domínio sem dependência de Postgres/HTTP/Next.js, repository ports + adapters (para permitir a troca por NoSQL na Fase 2 sem reescrever regra de negócio), sem microserviços, sem framework de DI pesado.

Fora do escopo da Fase 1: NoSQL, microserviços, autenticação sofisticada (OAuth, MFA), app mobile, notificações (e-mail/WhatsApp/push), automações de marketing.

Terminologia: evento, edição, organizador, local (venue), categoria, tipo de ingresso, lote, pedido, item de pedido, pagamento, cupom, ingresso, participante, inscrição, check-in, cancelamento. Glossário em `ducktix/docs/glossario.md`.

Em aberto: profundidade da autenticação no fluxo público de compra; se o participante público e o back-office compartilham a mesma aplicação Next.js ou vivem em rotas separadas.

## Brand Commitments

- Nome do produto: **Ducktix**. Tema de patos.
- Existe uma identidade visual já escrita em `ducktix/docs/DESIGN.md` (tech/editorial/quadrada; preto, branco e um único acento amarelo `#FFD400`; tipografia mono para títulos e labels; grid bento; cantos retos; temas escuro e claro). Ela é a autoridade visual incumbente — tratar como evidência a ser preservada, expandida ou substituída deliberadamente, nunca ignorada por acidente.
- Moodboards de referência em `ducktix/design/*.png`: copiar o estilo (grid bento, badges em mono, cards quadrados, duotone, textura de pontos), **não** a paleta verde neon deles.

## Evidence on Hand

- `ducktix/prd.md` — prompt mestre / especificação vigente do projeto.
- `ducktix/docs/` — manifesto, guidelines, glossário, fluxos, funcionalidades; `backend/` (entidades, api, services, fluxos, crons, signals) e `frontend/` (manifesto, páginas, componentes, estado, history-book).
- `ducktix/docs/DESIGN.md` — design system escrito.
- `ducktix/design/*.png` — 5 moodboards de referência visual.
- `drawSQL-image-export-2026-08-28.webp` — diagrama do esquema relacional.
- `Order Payment Ecosystem Flow-2026-08-28-162801.png` — diagrama do fluxo de pedido/pagamento.
- `documento_entrega_fase1.md` — documento de entrega da Fase 1.
- `readme.md` — enunciado oficial da professora.

Não existe ainda: código-fonte, banco populado, backup, dados reais de uso, screenshots de produto, depoimentos ou métricas. Nada disso deve ser fabricado.

## Product Principles

1. **O domínio não conhece a infraestrutura.** Regra de negócio não depende de Postgres, HTTP, JSON ou Next.js — é isso que torna a Fase 2 (NoSQL) uma troca de adapter, não uma reescrita.
2. **Toda tabela associativa merece um processo de negócio explícito**, não um CRUD genérico. É o critério de nota e também o que diferencia o produto de um cadastro.
3. **Consistência antes de conveniência.** Venda de ingresso é transacional e à prova de concorrência; nenhum fluxo pode deixar o banco inconsistente.
4. **A interface final é o produto.** A API é adaptador; o que o organizador e o participante veem é onde a aplicação é julgada — na defesa e como peça de portfólio.
5. **Profundidade de domínio sem inflar.** Cada entidade precisa de justificativa de negócio; nem simplificar o domínio, nem inventar tabelas para engordar a contagem.

## Accessibility & Inclusion

Nenhum requisito específico foi estabelecido pelo usuário ou pela disciplina. Interface em **português do Brasil**. O padrão de qualidade padrão (contraste, foco visível, navegação por teclado) se aplica; o design system já fixa texto preto sobre o amarelo por contraste.
