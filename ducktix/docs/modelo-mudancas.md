---
title: Modelo de dados — o que mudou
tags:
  - ducktix
  - banco-de-dados
  - modelagem
aliases:
  - Mudanças no modelo
updated: 2026-09-03
---

# O que mudou no modelo de dados

> [!abstract] Propósito
> Diferenças entre o modelo **previsto** (escrito antes da implementação, em
> `backend/entidades.md` e na versão anterior de `documento_entrega_fase1.md`)
> e o modelo **implementado** ([[modelo-conceitual]] / [[modelo-logico]]).
> Serve para defender as escolhas na apresentação: cada mudança tem um porquê.

## 1. Resumo

| | Previsto | Implementado |
|---|---|---|
| Tabelas | 17 | **18** |
| Associativas | 6 | **6** (outras) |
| Nomes | inglês (`ticket_batches`) | português (`lote`) |
| Dinheiro | `price` sem tipo definido | `*_centavos INTEGER` |

## 2. Mudanças estruturais

### 2.1 `ticket_batches` + `ticket_types` → `lote`

**Antes:** duas tabelas em cascata — o evento tinha lotes, e cada lote tinha
tipos de ingresso (inteira, meia, VIP) com preço e quantidade.

**Agora:** uma tabela `lote` com nome, preço, vagas e prazo.

**Por quê:** na prática o produto nunca precisou dos dois níveis. Um evento
vende "Pista" e "Mezanino" — ou "Lote 1" e "Lote 2" — mas nunca "Lote 1 →
Pista → inteira/meia" com preço e estoque em cada nível. Manter dois níveis
obrigaria toda venda a atravessar uma tabela que sempre teria uma linha só, e
o contador de estoque ficaria ambíguo (fica no lote ou no tipo?). Um nível só
deixa claro **onde o estoque mora**, que é o ponto crítico da concorrência.

> [!warning] Ponto de atenção na defesa
> Esta é a única simplificação do modelo. Se a professora entender que
> lote × tipo de ingresso é parte essencial do domínio, a volta é barata:
> recriar `tipo_de_ingresso` com FK para `lote` e mover `preco_centavos`,
> `vagas` e `vendidos` para lá.

### 2.2 `registrations` → `inscricao` (papel ampliado)

**Antes:** `registrations` existia só para eventos gratuitos ou "que exigem
apenas inscrição, sem transação financeira". Evento pago gerava `tickets`, sem
inscrição.

**Agora:** `inscricao` é criada **sempre**, para todo ingresso vendido, e é a
associativa central participante × evento.

**Por quê:** dois caminhos diferentes para a mesma pergunta ("quem está neste
evento?") obrigariam todo relatório a fazer `UNION` entre inscrição e ingresso,
e a taxa de ocupação teria duas fórmulas. Com um caminho só, ocupação, presença
e receita saem de uma tabela. Evento gratuito é apenas o caso em que
`preco_pago_centavos = 0`.

### 2.3 `tickets` → `ingresso` (1:1 com inscrição)

**Antes:** `tickets` apontava para `order_item` e `participant`, carregando os
dados do participante.

**Agora:** `ingresso` aponta só para `inscricao` (1:1) e guarda o que é do
documento: código do QR, status e emissão. Quem é a pessoa fica em
`participante`, via a inscrição.

**Por quê:** separa o **direito de entrar** (inscrição) do **documento que
comprova** (ingresso). Reemitir um ingresso perdido não deveria criar uma nova
inscrição nem duplicar a vaga.

### 2.4 `participante` virou entidade própria

**Antes:** `participants` era uma especialização de `users` — quem ocupa a vaga
precisava ter conta.

**Agora:** `participante` tem `usuario_id` **nulável**.

**Por quê:** o checkout permite comprar 3 ingressos nominais a 3 amigos que não
têm conta. Exigir usuário para cada participante quebraria o fluxo real de
compra em grupo.

### 2.5 `cancellation_requests` mudou de alvo

**Antes:** `order_id` — cancelava o pedido inteiro.

**Agora:** `inscricao_id` — cancela uma vaga.

**Por quê:** quem compra 4 ingressos e desiste de 1 não quer cancelar a compra
toda. O cancelamento é da vaga, e é isso que o contador de inscritos precisa
enxergar.

## 3. Tabelas novas

| Tabela | Por que passou a existir |
|---|---|
| **`cupom_evento`** | Cupom restrito a eventos específicos. O vínculo é obrigatório para aplicação; o código pode repetir em eventos diferentes. |
| **`uso_de_cupom`** | O modelo antigo só tinha o contador `usage_count`. O organizador precisa saber **em que evento** o código circulou e quanto desconto gerou — é o relatório 3. |

## 4. Tabelas descartadas e relações 1:1 que viraram colunas

| Tabela prevista | O que aconteceu |
|---|---|
| **`local`** | **Removida.** A plataforma não cadastra locais reutilizáveis — o endereço é texto livre no próprio evento (`evento.local`), exatamente como o código já fazia. A restrição "online não tem local, presencial tem" continua garantida por `CHECK`. |
| **`dados_cobranca`** | **Virou colunas de `pedido`** (`cobranca_cpf`, `cobranca_cep`, …). A relação é 1:1 e o dado nunca é lido sem o pedido; uma tabela à parte só acrescentaria um JOIN. Um `CHECK` garante que pedido confirmado tem cobrança preenchida — carrinho aberto pode não ter. |
| **`dados_profissionais`** | **Virou colunas de `participante`** (`linkedin`, `github`, `empresa`, `segmento`, `cargo`, `nivel`). Mesmo raciocínio: 1:1, sempre lido junto. Ficou no participante e **não no pedido**, porque um pedido com 4 ingressos tem 4 conjuntos de dados profissionais, um por pessoa — no pedido, três se perderiam. |

## 5. Mudanças de atributo

| Onde | Mudança | Motivo |
|---|---|---|
| `evento.local` | texto livre (era FK para `local`) | Sem cadastro de locais nesta fase; espelha o que o código faz. |
| Todo valor monetário | `price` → `*_centavos INTEGER` | Ponto flutuante para dinheiro produz erro de arredondamento acumulado. |
| `evento.slug` | **novo**, UK | URL pública estável. Não acompanha o nome ao renomear: já pode estar em ingresso emitido ou link compartilhado. |
| `evento.visibilidade` | **novo** | Evento "não listado" já está publicado (compra funciona por link direto), só não aparece em listagens — é distinto de `status`. |
| `evento.formato_online` | **novo** | Como a parte online acontece (ao vivo, videoconferência, desafio, conteúdo sob demanda). |
| `pedido.reservado_ate` | **novo** | Reserva de 30 min das vagas enquanto o participante preenche o checkout. |
| `inscricao.lote_id`, `preco_pago_centavos` | **novos** (denormalizados) | Evitam dois JOINs nos relatórios sobre tabela de milhões de linhas. |
| `check_in.ingresso_id` | ganhou `UNIQUE` | O modelo antigo dizia "um check-in por ingresso" no texto; agora o banco garante. |

## 6. Restrições que passaram a ser do banco

O modelo anterior descrevia regras em prosa. Agora elas são `CHECK` e `UNIQUE`
verificáveis — testadas e barrando de fato:

| Regra | Como é garantida |
|---|---|
| Não vender mais que as vagas | `CHECK (vendidos <= vagas)` em `lote` |
| Evento online não tem local | `CHECK` composta em `evento` |
| Presencial/híbrido exige local | `CHECK` composta em `evento` |
| Online/híbrido exige formato | `CHECK` composta em `evento` |
| Término depois do início | `CHECK (termina_em > comeca_em)` |
| Desconto percentual ≤ 100% | `CHECK` em `cupom` |
| Cupom não estoura o limite | `CHECK (usos <= limite_uso)` |
| Um check-in por ingresso | `UNIQUE (ingresso_id)` |
| E-mail de usuário único | `UNIQUE (email)` |

## 7. Alinhamento entre aplicação e banco

O schema PostgreSQL é a fonte de persistência da aplicação. Algumas estruturas
de domínio continuam existindo como DTOs ou estado transitório antes da
confirmação do pedido, mas os fatos definitivos são gravados nas tabelas
relacionais:

| Conceito | No banco | Na aplicação hoje |
|---|---|---|
| Organizador | tabela `organizador` com FK | resolvido por `usuario_id` no adapter Drizzle |
| Categoria | `categoria` + `evento_categoria` (N:N) | consultada e filtrada a partir do banco |
| Pagamento | tabela `pagamento` | criado durante a confirmação do pedido |
| Check-in | tabela `check_in` | fluxo de validação em `/organizer/events/[id]/check-in` |

Os *ports* (`CatalogoPublicoRepository`, `CupomRepository`,
`IngressosRepository`) continuam isolando o domínio dos adapters Drizzle. O
estado de checkout antes da confirmação é transitório por definição; depois
da confirmação, cupom, participantes, inscrições, pagamentos e ingressos são
persistidos em suas tabelas próprias.

**Organizador — decisão revista depois que `/organizer` precisou filtrar por
dono.** A primeira versão desta migração resolvia o `organizador_id` casando
`organizador` (texto livre do port) pelo nome do usuário logado — funcionava
para exibição, mas não dava pra usar como FK confiável: nome pode repetir
entre contas, e um organizador de primeira viagem (sem `organizador` ainda)
caía no fallback e ficava com `usuario_id NULL`, órfão da própria conta.
Como o back-office (`/organizer`) precisa listar só os eventos de quem está
logado, essa fragilidade virou bug real, não só falta de elegância.

A correção: `DadosDeNovoEvento` ganhou `organizadorUsuarioId` (o id de
sessão de quem está criando, não mais adivinhado por nome) — isso tocou
`application/criar-evento.ts` e a Server Action de criar evento, então não é
mais uma troca isolada de infraestrutura, é a mesma mudança de contrato que a
pergunta "isso é por organizador?" sempre ia exigir. O repositório Drizzle
agora faz find-or-create de `organizador` por `usuario_id` diretamente
([drizzle-catalogo.ts](../src/server/event/infrastructure/drizzle-catalogo.ts),
`resolverOrganizadorIdPorUsuario`). `organizador.usuario_id` continua nulável
(ver comentário da coluna em `db/schema.sql`) só pelo caso residual de dados
inseridos fora da aplicação (o `db/seed.sql` gerado sempre preenche).

`Evento.organizadorUsuarioId` (domínio) e `CatalogoPublicoRepository
.listarDoOrganizador()` (port) existem só por causa disso — é o que
`/organizer`, o seletor de evento do header e a checagem de dono em
`events/[id]/layout.tsx` usam para nunca mostrar o evento de outra conta.

**`pedido.cupom_id` e `pedido.participantes_rascunho` — mesma classe de
decisão, na migração de `ticketing`.** O agregado `Pedido` em memória guarda
estado do checkout que ainda não virou fato: qual cupom está aplicado antes
da compra confirmar (a auditoria de verdade é `uso_de_cupom`, gravada só em
`confirmarPedido`) e os dados de cada participante coletados na Etapa 1
antes de existir `participante`/`inscricao`/`ingresso` para eles. Nenhum dos
dois tinha coluna no schema porque descrevem uma compra ainda aberta, não
uma linha definitiva — adicionei `cupom_id UUID REFERENCES cupom(id)` e
`participantes_rascunho JSONB`, ambos nuláveis, só para sustentar esse
estado transitório. Somem em uso normal: confirmado o pedido, o cupom vira
`uso_de_cupom` e os participantes viram `participante`/`inscricao`/`ingresso`
de verdade — as duas colunas nunca são a fonte definitiva de nada.

## 8. Ver também

- [[modelo-conceitual]] — entidades, relacionamentos e cardinalidades
- [[modelo-logico]] — dicionário de dados completo
- `db/schema.sql` — DDL executável
- `db/gerar-seed.mjs` — gerador do seed a partir da fixture da aplicação
