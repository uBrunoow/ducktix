# Migração PostgreSQL → MongoDB (Fase 2)

Relatório da substituição do banco relacional da Fase 1 por um banco NoSQL
orientado a documentos. Enunciado: *substituir o banco de dados por um banco
equivalente em um modelo NoSQL e ajustar a aplicação (requisições e consultas
ao banco) para operar sobre o novo banco.*

Resultado: a aplicação usa **MongoDB 8** como único banco. Não há mais
PostgreSQL, Drizzle, SQL nem `DATABASE_URL` no código que roda.

---

## 1. Estado original

| Item | Fase 1 |
|---|---|
| Aplicação | Next.js 15 (App Router), React 19, TypeScript strict |
| Banco | PostgreSQL 16 (Docker na porta 5433; Neon em produção) |
| Acesso a dados | Drizzle ORM (`drizzle-orm`), drivers `postgres` e `@neondatabase/serverless` |
| Esquema | `src/server/db/schema.ts` + 6 migrations em `drizzle/`; `db/schema.sql` como DDL de entrega |
| Dados | `db/backup.sql` (`pg_dump` texto puro), `db/seed.sql` |
| Testes automatizados | nenhum |

A arquitetura já era *ports and adapters* por contexto (`identity`, `event`,
`ticketing`, `participation`):

```text
src/server/<contexto>/
  domain/          regras puras (sem banco, sem HTTP)
  application/     casos de uso — dependem só das interfaces de ports/
  ports/           interfaces de repositório
  infrastructure/  implementação Drizzle/PostgreSQL  ← único ponto trocado
```

Não existe API REST. As "rotas" são **Server Components** (leitura) e
**Server Actions** (escrita) do Next.js. A única Route Handler,
`POST /api/uploads`, envia imagens ao Vercel Blob e não toca no banco.

## 2. Estrutura PostgreSQL

18 tabelas, todas com chave primária UUID (`gen_random_uuid()`), dinheiro em
centavos inteiros e `timestamptz`. As regras de domínio estavam em `CHECK`s
(enums, faixas, coerência entre colunas) e a integridade referencial em FKs
com `ON DELETE CASCADE`/`SET NULL`/`RESTRICT`.

| Grupo | Tabelas |
|---|---|
| Identidade | `usuario`, `organizador`, `participante`, `token_redefinicao_senha` |
| Eventos | `categoria`, `evento`, `evento_categoria`, `lote` |
| Vendas | `cupom`, `cupom_evento`, `uso_de_cupom`, `pedido`, `item_pedido`, `pagamento` |
| Participação | `inscricao`, `ingresso`, `check_in`, `cancelamento_de_inscricao` |

O DDL completo está preservado em
[`../database/legacy-postgres/schema.sql`](../database/legacy-postgres/schema.sql).

## 3. Tabelas e relacionamentos

| Tabela | PK | FKs / cardinalidade | Restrições relevantes | Usada por (repositório) |
|---|---|---|---|---|
| `usuario` | `id` | — | `email UNIQUE`; `CHECK papel`, `CHECK cpf_cnpj` 11/14 | usuários; catálogo (dono do evento) |
| `organizador` | `id` | `usuario_id → usuario` **1:1** (`UNIQUE`, cascade) | — | catálogo |
| `participante` | `id` | `usuario_id → usuario` N:1 (nulo, set null) | — | ingressos, inscrições, cancelamentos |
| `token_redefinicao_senha` | `token` | `usuario_id → usuario` N:1 (cascade) | — | usuários |
| `categoria` | `id` | — | `nome`, `slug UNIQUE` | catálogo |
| `evento` | `id` | `organizador_id → organizador` N:1 | `slug UNIQUE`; 7 `CHECK`s (status, modalidade, período, local × modalidade...) | catálogo |
| `evento_categoria` | (`evento_id`,`categoria_id`) | **N:N** evento × categoria (cascade) | — | catálogo |
| `lote` | `id` | `evento_id → evento` 1:N (cascade) | `UNIQUE (evento_id, nome)`; `vendidos <= vagas` | catálogo |
| `cupom` | `id` | — | `CHECK usos <= limite_uso`, `percentual <= 100` | cupons |
| `cupom_evento` | (`cupom_id`,`evento_id`) | **N:N** cupom × evento (cascade) | — | cupons |
| `uso_de_cupom` | `id` | → `cupom`, `pedido` (cascade), `evento` | `UNIQUE (cupom, pedido, evento)` | cupons |
| `pedido` | `id` | `comprador_id → usuario` N:1; `cupom_id → cupom` | `CHECK status`; cobrança completa se confirmado | pedidos |
| `item_pedido` | `id` | `pedido_id → pedido` 1:N (cascade); `lote_id → lote` (restrict) | `UNIQUE (pedido_id, lote_id)` | pedidos, ingressos |
| `pagamento` | `id` | `pedido_id → pedido` 1:N (cascade) | `CHECK metodo/status` | pedidos |
| `inscricao` | `id` | → `evento`, `participante`, `item_pedido` (cascade), `lote` | `UNIQUE (evento, participante, item_pedido)` | inscrições, ingressos, cancelamentos |
| `ingresso` | `id` | `inscricao_id → inscricao` **1:1** | `codigo UNIQUE` (conteúdo do QR) | ingressos, inscrições |
| `check_in` | `id` | `ingresso_id → ingresso` **1:1** (`UNIQUE`); `operador_id → usuario` | — | inscrições |
| `cancelamento_de_inscricao` | `id` | `inscricao_id → inscricao` 1:N | `CHECK status` | cancelamentos |

## 4. Endpoints afetados

Como não há API REST, o inventário é o das telas (GET renderizado no
servidor) e das Server Actions (POST). **Nenhuma rota, parâmetro ou
contrato mudou**: as telas recebem os mesmos objetos de domínio de antes.

### Leitura (Server Components)

| Rota | Repositórios usados | Operação no banco |
|---|---|---|
| `/` · `/events` | catálogo | eventos publicados por período, categorias |
| `/events/[slug]` | catálogo | evento + lotes |
| `/checkout/[id]` · `/payment` | pedidos, cupons, catálogo, usuários | pedido com itens, cupom, evento |
| `/checkout/[id]/thank-you` | pedidos, ingressos, catálogo | ingressos emitidos do pedido |
| `/my-tickets` · `/my-tickets/[id]` | pedidos, ingressos, catálogo, cancelamentos | pedidos do comprador → ingressos → solicitação mais recente |
| `/account` | usuários | perfil |
| `/organizer` · `/organizer/events` | catálogo, inscrições, usuários | eventos do organizador, totais |
| `/organizer/events/[id]` (visão geral, relatórios) | catálogo, inscrições, cupons | agregação de inscrições, vendas por lote, usos de cupom |
| `/organizer/events/[id]/attendees` | inscrições | lista paginada com busca e filtro de presença |
| `/organizer/events/[id]/orders` | inscrições, cupons | pedidos do evento e descontos |
| `/organizer/events/[id]/check-in` | inscrições | painel da portaria, últimos check-ins |
| `/organizer/events/[id]/coupons[/...]` | cupons, catálogo | cupons do evento, histórico de usos |
| `/organizer/events/[id]/cancellations` | cancelamentos | solicitações pendentes |
| `/organizer/events/[id]/lotes` · `/edit` | catálogo | evento e lotes |

### Escrita (Server Actions)

| Ação | Arquivo | Repositórios | Operação |
|---|---|---|---|
| `acaoRegistrar`, `acaoLogin`, `acaoSair` | `(public)/(auth)/acoes.ts` | usuários | insert usuário / busca por e-mail |
| `acaoSolicitarRedefinicao`, `acaoRedefinirSenha` | `(public)/(auth)/acoes.ts` | usuários | token: insert, busca, delete; update senha |
| `acaoAtualizarPerfil`, `acaoAtualizarFoto`, `acaoAlterarSenha` | `account/acoes.ts` | usuários | update |
| `acaoAdicionarAoCarrinho` | `events/[slug]/acoes.ts` | pedidos, catálogo | pedido aberto: find-or-create, item upsert, reserva |
| `acaoAplicarCupom`, `acaoAvancarParaPagamento`, `acaoCancelarPedido` | `checkout/[id]/acoes.ts` | pedidos, cupons | cupom no pedido; participantes, cobrança, pagamento pendente; status |
| `acaoConfirmarPedido` | `checkout/[id]/payment/acoes.ts` | pedidos, cupons, catálogo, ingressos | uso do cupom, baixa de estoque, emissão de ingressos, confirmação |
| `acaoSolicitarCancelamento` | `my-tickets/acoes.ts` | cancelamentos | nova solicitação |
| `acaoCriarEvento` | `organizer/events/new/acoes.ts` | catálogo, usuários | insert evento + lotes + categoria; organizador find-or-create |
| `acaoPublicarEvento`, `acaoEditarEvento`, `acaoDespublicarEvento`, `acaoCancelarEvento`, `acaoExcluirEvento` | `organizer/events/.../acoes.ts` | catálogo | update/delete evento |
| `acaoAdicionarLote`, `acaoAtualizarLote`, `acaoExcluirLote` | `.../lotes/acoes.ts` | catálogo | lote: insert/update/delete |
| `acaoCriarCupomDoEvento`, `acaoDefinirCupomAtivoNoEvento` | `.../coupons/acoes.ts` | cupons | insert / update |
| `acaoLerCodigo`, `acaoDesfazerCheckIn`, `acaoAtualizarPainelDaPortaria` | `.../check-in/acoes.ts` | inscrições | check-in insert/delete, últimos check-ins |
| `acaoResolverCancelamento` | `.../cancellations/acoes.ts` | cancelamentos | decide solicitação, cancela inscrição e ingresso |

A troca na camada de entrada foi só o import: 38 arquivos passaram de
`infrastructure/drizzle-*` para `infrastructure/mongo-*`.

## 5. Queries SQL encontradas e equivalentes MongoDB

Todo SQL da aplicação estava nos 7 repositórios Drizzle (removidos). Abaixo,
cada consulta, em SQL equivalente ao que o Drizzle gerava, e a operação que
a substitui.

### Catálogo (`event/infrastructure/mongo-catalogo.ts`)

| Método | PostgreSQL | MongoDB |
|---|---|---|
| `listarCategorias` | `SELECT nome FROM categoria ORDER BY nome` | `categorias.find().sort({nome: 1})` |
| `listarPublicados` | `SELECT e.*, o.nome_fantasia FROM evento e JOIN organizador o ... WHERE status='publicado' AND comeca_em >= $1 AND comeca_em < $2 ORDER BY comeca_em` + 2 consultas (`lote`, `evento_categoria JOIN categoria`) | `eventos.find({status: 'publicado', comecaEm: {$gte, $lt}}).sort({comecaEm: 1})` — uma consulta, lotes e categorias já vêm no documento |
| `listarTodos` / `buscarPorId` | idem sem filtro / `WHERE e.id = $1` | `find({})` / `findOne({_id})` |
| `listarDoOrganizador` | `... WHERE o.usuario_id = $1` | `find({'organizador.usuarioId': id})` |
| `registrarVenda` | `BEGIN; SELECT vagas, vendidos FROM lote WHERE id=$1 FOR UPDATE; UPDATE lote SET vendidos = vendidos + $2; COMMIT` | `updateOne({_id, lotes: {$elemMatch: {_id: loteId, vendidos: {$lte: vagas - qtd}}}}, {$inc: {'lotes.$.vendidos': qtd}})` |
| `criar` | transação: find-or-create `organizador`, `SELECT categoria`, `SELECT slug`, `INSERT evento`, `INSERT evento_categoria`, `INSERT lote` × N | `usuarios.findOneAndUpdate({_id, organizador: null}, {$set: {organizador}})` + `eventos.insertOne(doc)` com lotes e categoria embutidos |
| `publicar` / `despublicar` / `cancelar` | `UPDATE evento SET status = ...` | `updateOne({_id}, {$set: {status}})` |
| `excluir` | `DELETE FROM evento` (cascade em lote, `evento_categoria`, `cupom_evento`; `item_pedido.lote_id` bloqueia) | checagem `pedidos.countDocuments({'itens.eventoId'})`, `eventos.deleteOne`, `cupons.updateMany({$pull: {eventosIds}})` |
| `atualizar` | transação: `UPDATE evento`, `DELETE`+`INSERT evento_categoria` | `findOneAndUpdate({_id}, {$set: {..., categorias: [categoria]}})` |
| `adicionarLote` | `SELECT max(ordem)`; `INSERT lote` (`UNIQUE (evento_id, nome)`) | `updateOne({_id, 'lotes.nome': {$ne: nome}}, {$push: {lotes: novo}})` |
| `atualizarLote` | `SELECT vendidos`; `UPDATE lote` | `updateOne({_id, lotes: {$elemMatch: {_id: loteId, vendidos: 0}}}, {$set: {'lotes.$.campo': ...}})` |
| `excluirLote` | `SELECT count(*)`, `SELECT vendidos`, `DELETE FROM lote` | checagens + `updateOne({_id, 'lotes.1': {$exists: true}}, {$pull: {lotes: {_id: loteId, vendidos: 0}}})` |

### Usuários (`identity/infrastructure/mongo-usuarios.ts`)

| Método | PostgreSQL | MongoDB |
|---|---|---|
| `buscarPorEmail` / `buscarPorId` | `SELECT * FROM usuario WHERE email/id = $1` | `findOne({email})` / `findOne({_id})` |
| `criar` | `INSERT INTO usuario ... RETURNING *` | `insertOne` (índice único em `email`) |
| `atualizarSenha/Nome/Email/CpfCnpj/Foto` | `UPDATE usuario SET ... RETURNING *` | `findOneAndUpdate({_id}, {$set}, {returnDocument: 'after'})` |
| `criarTokenDeRedefinicao` | `INSERT INTO token_redefinicao_senha` | `tokensRedefinicaoSenha.insertOne` |
| `buscarTokenDeRedefinicao` / `invalidar...` | `SELECT` / `DELETE ... WHERE token = $1` | `findOne({_id: token})` / `deleteOne` |

### Pedidos (`ticketing/infrastructure/mongo-pedidos.ts`)

| Método | PostgreSQL | MongoDB |
|---|---|---|
| `buscarPorId`, `buscarAbertoPorParticipante`, `listarPorParticipante` | `SELECT * FROM pedido WHERE ...` + `item_pedido JOIN lote` (para `evento_id`) + `pagamento ORDER BY criado_em DESC` | `findOne`/`find` — itens (já com `eventoId`) e pagamentos embutidos |
| `criarAberto` | `INSERT INTO pedido` | `insertOne` |
| `participanteJaInscritoNoEvento` | `SELECT 1 FROM inscricao JOIN participante ... WHERE evento_id=$1 AND cpf=$2 AND status='ativa'` | `inscricoes.countDocuments({eventoId, 'participante.cpf': cpf, status: 'ativa'}, {limit: 1})` |
| `adicionarItem` | `INSERT INTO item_pedido ... ON CONFLICT (pedido_id, lote_id) DO UPDATE SET quantidade = quantidade + $n` | `$inc` no item existente (`'itens.loteId': loteId`) ou `$push` com `'itens.loteId': {$ne}` no filtro |
| `definirCupom`, `definirParticipantes`, `definirCobranca` | `UPDATE pedido SET ...` (8 colunas `cobranca_*`; `participantes_rascunho` jsonb) | `findOneAndUpdate({_id}, {$set})` — cobrança é um subdocumento |
| `garantirReserva` | `UPDATE pedido SET reservado_ate=$2 WHERE id=$1 AND reservado_ate IS NULL` | `updateOne({_id, reservadoAte: null}, {$set: {reservadoAte}})` |
| `atualizarStatus` | transação: `UPDATE pedido`; `UPDATE pagamento SET status='aprovado' WHERE status='pendente'` | `findOneAndUpdate` com `arrayFilters` (`pagamentos.$[pendente]`); ao confirmar, `inscricoes.updateMany({pedidoId}, {$set: {pedidoConfirmadoEm}})` |
| `definirMetodoPagamento` | transação: `SELECT` itens (soma), `DELETE` pagamento pendente, `INSERT pagamento` | um `findOneAndUpdate` com *pipeline*: `$filter` remove pendentes, `$sum`/`$map` calcula o valor, `$concatArrays` anexa o novo |

### Cupons (`ticketing/infrastructure/mongo-cupons.ts`)

| Método | PostgreSQL | MongoDB |
|---|---|---|
| `buscarPorCodigo` / `buscarPorId` | `SELECT * FROM cupom WHERE ...` + `SELECT evento_id FROM cupom_evento` | `findOne` — `eventosIds` embutido |
| `buscarPorCodigoNoEvento` | `SELECT c.* FROM cupom c JOIN cupom_evento ce ... WHERE codigo=$1 AND ce.evento_id=$2` | `findOne({codigo, eventosIds: eventoId})` (casa elemento do array) |
| `listarTodos` | `SELECT * FROM cupom ORDER BY criado_em DESC` + N consultas em `cupom_evento` | `find({}, {projection: {historicoDeUsos: 0}}).sort({criadoEm: -1})` |
| `criar` | transação: `INSERT cupom` + `INSERT cupom_evento` × N | `insertOne` |
| `definirAtivo` | `UPDATE cupom SET ativo` | `updateOne({_id}, {$set: {ativo}})` |
| `registrarUso` | transação: `INSERT uso_de_cupom` (`UNIQUE`), `UPDATE cupom SET usos = usos + 1` (`CHECK usos <= limite`) | `updateOne({_id, $expr: {$lt: ['$usos', '$limiteUso']}, historicoDeUsos: {$not: {$elemMatch: {pedidoId, eventoId}}}}, {$inc: {usos: 1}, $push: {historicoDeUsos: uso}})` |
| `listarUsos` | `SELECT * FROM uso_de_cupom WHERE cupom_id=$1 ORDER BY usado_em DESC` | `findOne({_id}, {projection: {historicoDeUsos: 1}})` |
| `listarUsosPorEvento` | `SELECT * FROM uso_de_cupom WHERE evento_id=$1 ORDER BY usado_em DESC` | `aggregate([{$match}, {$unwind: '$historicoDeUsos'}, {$match}, {$sort}])` |

### Inscrições e check-in (`participation/infrastructure/mongo-inscricoes.ts`)

| Método | PostgreSQL | MongoDB |
|---|---|---|
| `listarPorEvento` | `SELECT ... FROM inscricao JOIN item_pedido JOIN pedido JOIN lote JOIN participante JOIN ingresso LEFT JOIN check_in WHERE evento_id=$1 [AND status <> 'cancelada'] [AND check_in IS (NOT) NULL] [AND (nome‖sobrenome‖email‖codigo) ILIKE $busca] ORDER BY pedido.criado_em DESC LIMIT $n OFFSET $m` + `count(*)` com os mesmos JOINs | `find({$and: [...]})` com `$regexMatch` (`options: 'i'`) sobre `$concat` dos campos, `.sort({pedidoCriadoEm: -1, _id: 1}).skip().limit()` + `countDocuments` — **nenhum JOIN** |
| `todasDoEvento` | o mesmo JOIN de 7 tabelas, sem paginação | `find({eventoId})` |
| `buscarPorCodigo` | `... WHERE ingresso.codigo = $1` | `findOne({'ingresso.codigo': codigo})` (índice único) |
| `registrarCheckIn` | `INSERT INTO check_in ... SELECT ... ON CONFLICT (ingresso_id) DO NOTHING` | `updateOne({_id, checkIn: null}, {$set: {checkIn: {...}}})` |
| `desfazerCheckIn` | `DELETE FROM check_in WHERE ingresso_id IN (SELECT ...)` | `updateOne({_id}, {$set: {checkIn: null}})` |
| `ultimosCheckIns` | JOIN de 7 tabelas `WHERE check_in IS NOT NULL ORDER BY realizado_em DESC LIMIT $n` | `find({eventoId, checkIn: {$ne: null}}).sort({'checkIn.realizadoEm': -1}).limit(n)` |

### Ingressos (`participation/infrastructure/mongo-ingressos.ts`)

| Método | PostgreSQL | MongoDB |
|---|---|---|
| `emitir` | `SELECT` item; transação: `INSERT participante`, `INSERT inscricao`, `INSERT ingresso` | lê item (`pedidos.findOne({'itens._id'}, {'itens.$': 1})`) e lote; **um** `inscricoes.insertOne` com participante, ingresso e cópias do pedido |
| `listarPorItensDePedido` | `SELECT ... FROM ingresso JOIN inscricao JOIN participante WHERE item_pedido_id IN (...)` | `find({itemPedidoId: {$in: ids}})` |

### Cancelamentos (`participation/infrastructure/mongo-cancelamentos.ts`)

| Método | PostgreSQL | MongoDB |
|---|---|---|
| `buscarContextoDoIngresso` | `ingresso JOIN inscricao JOIN item_pedido JOIN pedido LEFT JOIN check_in` | `inscricoes.findOne({'ingresso.id': id})` |
| `buscarPorInscricao` / `buscarPorIngresso` | JOIN de 6 tabelas `ORDER BY solicitado_em DESC LIMIT 1` | `findOne` + solicitação mais recente do array `cancelamentos` |
| `solicitar` | `INSERT INTO cancelamento_de_inscricao` | `findOneAndUpdate({_id}, {$push: {cancelamentos: novo}})` |
| `listarSolicitadosDoEvento` | JOIN de 6 tabelas `WHERE evento_id=$1 AND status='solicitado'` | `aggregate([{$match: {eventoId, 'cancelamentos.status': 'solicitado'}}, {$unwind: '$cancelamentos'}, {$match}, {$sort}])` |
| `resolver` | transação: `UPDATE cancelamento ... WHERE status='solicitado'`; se aprovado, `UPDATE inscricao`, `UPDATE ingresso` | **um** `updateOne` com `cancelamentos: {$elemMatch: {_id, status: 'solicitado'}}` no filtro, alterando `cancelamentos.$`, `status` e `ingresso.status` juntos |

## 6. Modelo MongoDB

7 collections. `_id` é string (o UUID v4 gerado pela aplicação), não
`ObjectId`: são os mesmos ids da Fase 1, usados em URLs, cookie de sessão e
QR codes. Tipos TypeScript dos documentos em
[`../src/server/db/colecoes.ts`](../src/server/db/colecoes.ts); validação no
banco em [`../database/criar-banco.js`](../database/criar-banco.js).

### `usuarios` ← `usuario` + `organizador`

```js
{
  _id: "891c844b-…", nome: "Prefeitura de Urubici", email: "prefeitura-de-urubici@example.com",
  senhaHash: "99610e4e…", papel: "organizador", cpfCnpj: null, fotoUrl: null,
  criadoEm: ISODate("…"),
  organizador: { id: "6511f0eb-…", nomeFantasia: "Prefeitura de Urubici", documento: null, emailContato: null }
}
```

### `tokensRedefinicaoSenha` ← `token_redefinicao_senha`

```js
{ _id: "<token base64url>", usuarioId: "891c844b-…", expiraEm: ISODate("…") }   // índice TTL em expiraEm
```

### `categorias` ← `categoria`

```js
{ _id: "4486ef05-…", nome: "Música", slug: "musica" }
```

### `eventos` ← `evento` + `lote` + `evento_categoria`

```js
{
  _id: "…", slug: "festival-de-inverno-tardio", nome: "Festival de Inverno Tardio",
  descricao: "<p>…</p>", local: "Urubici · SC", modalidade: "presencial", formatoOnline: null,
  status: "publicado", visibilidade: "publico", comecaEm: ISODate("…"), terminaEm: ISODate("…"),
  imagemUrl: null, isHighlighted: false, criadoEm: ISODate("…"),
  organizador: { id: "6511f0eb-…", usuarioId: "891c844b-…", nome: "Prefeitura de Urubici" },
  categorias: [ { id: "4486ef05-…", nome: "Música" } ],
  lotes: [
    { _id: "6e97b5ec-…", nome: "Solidário", precoCentavos: 0, vagas: 500, vendidos: 500,
      iniciaEm: null, encerraEm: ISODate("…"), ordem: 0 },
    …
  ]
}
```

### `cupons` ← `cupom` + `cupom_evento` + `uso_de_cupom`

```js
{
  _id: "1c421cd7-…", codigo: "INVERNO25", tipoDesconto: "percentual", valor: 25,
  validoDe: ISODate("…"), validoAte: ISODate("…"), limiteUso: 200, usos: 1, ativo: true,
  criadoEm: ISODate("…"),
  eventosIds: [ "13880925-…" ],
  // um elemento por (pedido, evento) em que o cupom foi usado; usos == tamanho do array
  historicoDeUsos: [ { _id: "…", pedidoId: "…", eventoId: "13880925-…", descontoCentavos: 1750, usadoEm: ISODate("…") } ]
}
```

### `pedidos` ← `pedido` + `item_pedido` + `pagamento`

```js
{
  _id: "a280ead6-…", compradorId: "533da962-…", status: "confirmado",
  criadoEm: ISODate("…"), reservadoAte: null, confirmadoEm: ISODate("…"),
  cupomId: null, participantesRascunho: null,
  cobranca: { cpf: "12345678909", endereco: { cep: "88010000", logradouro: "Rua Bocaiuva", numero: "12",
              complemento: "", bairro: "Centro", cidade: "Florianópolis", uf: "SC" } },
  itens: [ { _id: "ca0d3dfd-…", loteId: "16580d18-…", eventoId: "926114a6-…", quantidade: 1, precoUnitarioCentavos: 4900 } ],
  pagamentos: [ { _id: "…", metodo: "pix", status: "aprovado", valorCentavos: 4900,
                  codigoExterno: null, criadoEm: ISODate("…"), pagoEm: ISODate("…") } ]
}
```

### `inscricoes` ← `inscricao` + `participante` + `ingresso` + `check_in` + `cancelamento_de_inscricao`

```js
{
  _id: "d2800446-…", eventoId: "926114a6-…", pedidoId: "6805b9d9-…", itemPedidoId: "aacf080f-…",
  compradorId: "533da962-…",
  lote: { id: "16580d18-…", nome: "Lote 1" },
  precoPagoCentavos: 4900, status: "ativa", comoConheceu: null, inscritoEm: ISODate("…"),
  pedidoCriadoEm: ISODate("…"), pedidoConfirmadoEm: ISODate("…"),
  participante: { nome: "Isabela", sobrenome: "Fernandes", email: "isabela.fernandes1@example.com",
                  cpf: null, celular: null, nomeCracha: null, linkedin: null, github: null,
                  empresa: null, segmento: null, cargo: null, nivel: null },
  ingresso: { id: "c1e15999-…", codigo: "semana-de-dados-2026-1", status: "utilizado", emitidoEm: ISODate("…") },
  checkIn: { realizadoEm: ISODate("…"), operadorId: null },
  cancelamentos: []
}
```

### Diagrama de referências

```text
usuarios ──(organizador.usuarioId)──< eventos >──(eventosIds)── cupons
   │                                    │  ▲
   │ compradorId                        │  │ itens.eventoId / itens.loteId
   ▼                                    │  │
pedidos ──(pedidoId, itemPedidoId)──< inscricoes (eventoId) >───┘
```

`>` marca o lado "muitos". Tudo que não aparece no diagrama está embutido.

## 7. Justificativa das decisões de modelagem

A pergunta foi **"o que cada tela lê de uma vez?"**, não "como cada tabela
vira collection". Os padrões de acesso encontrados:

| Padrão de acesso | Frequência | Decisão |
|---|---|---|
| Vitrine e página do evento: evento + lotes + categoria + nome do organizador | a mais alta do sistema (público) | evento é **um documento** com tudo embutido; zero JOIN |
| Lista de inscritos paginada com busca por nome/e-mail/código e filtro de presença | alta, sobre eventos com +1.000 inscritos | `inscricoes` traz participante, ingresso, check-in e lote; a lista é um `find` paginado num índice `(eventoId, pedidoCriadoEm)` |
| Portaria: ler o QR, validar e gravar a entrada | rajadas no dia do evento, com concorrência | código do ingresso com índice único; check-in é campo da própria inscrição, gravado com update condicional |
| Checkout: carrinho, cupom, cobrança, pagamento | por compra | pedido com itens e pagamentos embutidos; cada etapa é um update num documento |
| "Meus ingressos": pedidos do comprador e seus ingressos | por acesso do participante | `pedidos` por `compradorId` + `inscricoes` por `itemPedidoId` |
| Relatórios por evento (participação, vendas, cupons) | painel do organizador | vendas vêm dos lotes embutidos (`vendidos`); participação, de `inscricoes` do evento; cupons, de `$unwind` do histórico |
| Organizador da conta | ao criar evento | 1:1 com o usuário, embutido em `usuarios` |

Alternativas descartadas:

- **Inscrições dentro do evento:** um evento real passa de mil inscrições
  (o *Festival de Inverno Tardio* do seed tem 1.084) e cada uma recebe
  check-in e cancelamento separadamente. Embutir faria todo check-in
  reescrever um documento grande e disputado, e aproximaria o limite de
  16 MB por documento. Ficaram como collection própria, referenciando o
  evento.
- **Inscrições dentro do pedido:** a lista de inscritos é consultada **por
  evento**, não por pedido; embutir obrigaria a um `$unwind` em todos os
  pedidos para montar a lista e paginar.
- **`participante` como collection:** na Fase 1 cada ingresso já criava
  sua própria linha de `participante` (dados nominais do portador, não uma
  conta). Não havia reaproveitamento entre ingressos, então ele virou
  subdocumento da inscrição.
- **Usos de cupom em collection própria:** o volume é baixo (limitado por
  `limiteUso`) e o uso precisa nascer junto com o incremento do contador.
  Embutido, os dois acontecem numa única operação atômica.

## 8. Estratégia de embedding / referencing

| Relação da Fase 1 | Cardinalidade | Estratégia | Motivo |
|---|---|---|---|
| usuario — organizador | 1:1 | **embedding** | sempre lido junto, nunca sozinho |
| evento — lote | 1:N pequeno | **embedding** | poucos lotes por evento, lidos e alterados junto com ele |
| evento — categoria | N:N | **embedding** de `{id, nome}` + collection `categorias` | o evento exibe o nome; a lista de categorias existe sozinha (filtros) |
| evento — organizador | N:1 | **referência estendida** `{id, usuarioId, nome}` | a vitrine mostra o nome sem ler `usuarios` |
| cupom — evento | N:N | **array de referências** `eventosIds` | "cupom vale no evento?" é um `find` por elemento do array |
| cupom — uso | 1:N limitado | **embedding** | atomicidade com o contador `usos` |
| pedido — item, pagamento, cobrança | 1:N pequeno / 1:1 | **embedding** | o pedido é a unidade do checkout |
| item — evento | N:1 | **referência** `eventoId` copiada no item | evita o antigo JOIN com `lote` só para achar o evento |
| inscrição — participante, ingresso, check-in | 1:1 | **embedding** | uma inscrição = um ingresso nominal |
| inscrição — cancelamento | 1:N pequeno | **embedding** | histórico curto por ingresso |
| inscrição — evento / pedido / item | N:1 | **referência** | crescem sem limite, consultados por outro eixo |
| inscrição — lote | N:1 | **referência estendida** `{id, nome}` | a lista de inscritos mostra o nome do lote |

**Cópias e consistência.** Toda cópia tem uma regra que impede ou corrige a
divergência:

- `lote.nome` na inscrição: lote com venda não pode ser renomeado (regra de
  negócio da Fase 1), e inscrição só existe depois da venda.
- `organizador.nome` no evento: o nome fantasia não é editável pela
  aplicação.
- `pedidoConfirmadoEm` na inscrição: gravado ao emitir e reaplicado por
  `updateMany` quando o pedido é confirmado (operação idempotente).

## 9. Índices

25 índices declarados em `database/criar-banco.js` (lista e equivalência com
a Fase 1 em [`../database/README.md`](../database/README.md#índices)). Pontos
principais:

- **Únicos** que substituem `UNIQUE`: e-mail do usuário, slug do evento,
  nome/slug da categoria, código e id do ingresso.
- **Compostos para as telas quentes:** `(eventoId, pedidoCriadoEm)` na lista
  de inscritos, `(status, comecaEm)` na vitrine, `(compradorId, status,
  criadoEm)` no carrinho.
- **Multikey** (sobre arrays): `eventosIds`, `historicoDeUsos.eventoId`,
  `itens._id`, `itens.loteId`, `itens.eventoId`, `cancelamentos.status`.
- **TTL** em `tokensRedefinicaoSenha.expiraEm`: o banco apaga sozinho os
  tokens vencidos — no PostgreSQL eles ficavam até serem usados.

Unicidades **dentro de um documento** (`UNIQUE (evento_id, nome)` do lote,
`UNIQUE (cupom, pedido, evento)` do uso, `UNIQUE (pedido_id, lote_id)` do
item) não podem ser índices únicos do MongoDB, que não comparam elementos do
mesmo array. Elas foram para o **filtro do update** (`'lotes.nome': {$ne}`,
`$not: {$elemMatch}`), o que as torna atômicas da mesma forma.

## 10. Alterações no backend

| Arquivo | Mudança |
|---|---|
| `src/server/db/client.ts` | `MongoClient` único por processo (guardado em `globalThis` por causa do hot reload); `db()` escolhe o database por `MONGODB_DB` |
| `src/server/db/colecoes.ts` | **novo** — interfaces dos documentos e acesso tipado às collections (substitui `schema.ts`) |
| `src/server/*/infrastructure/mongo-*.ts` | **novos** — os 7 repositórios, implementando os mesmos ports |
| `src/server/*/infrastructure/drizzle-*.ts`, `src/server/db/schema.ts` | removidos |
| 38 arquivos em `src/app/` e `src/components/` | import do repositório Mongo no lugar do Drizzle; nenhuma outra linha |
| `domain/`, `application/`, `ports/` | **sem alteração** |
| `drizzle.config.ts`, `scripts/migrate.mjs`, `drizzle/` | removidos (migrations movidas para `database/legacy-postgres/`) |
| `package.json` | `+ mongodb`; `- drizzle-orm, drizzle-kit, postgres, @neondatabase/serverless`; scripts `db:setup`, `db:seed`, `db:reset`, `test` |
| `docker-compose.yml` | `mongo:8` + `mongo-express` no lugar de `postgres:16` + `pgadmin` |
| `.env.example` | `MONGODB_URI`, `MONGODB_DB` no lugar de `DATABASE_URL` |

Foi usado o **driver oficial** (`mongodb`), sem ODM (Mongoose): as
validações já existiam no domínio, e o validador `$jsonSchema` dá a garantia
no banco. Um ODM duplicaria as duas.

### Transações e concorrência

O MongoDB tem transações multi-documento, mas só em *replica set*. O modelo
foi desenhado para **não precisar delas**: o que mudava junto numa transação
SQL agora mora no mesmo documento, e operações num único documento são
atômicas. Os pontos de concorrência viraram **updates condicionais** (a
condição no filtro, a alteração no update; se outra requisição chegou
antes, o filtro não casa):

| Garantia | Antes | Agora |
|---|---|---|
| Estoque do lote | `SELECT ... FOR UPDATE` | `vendidos <= vagas - qtd` no filtro + `$inc` |
| Um check-in por ingresso | `ON CONFLICT DO NOTHING` | `checkIn: null` no filtro |
| Limite e unicidade de uso do cupom | transação + `CHECK` + `UNIQUE` | `$expr: {$lt: ['$usos', '$limiteUso']}` e `$not: {$elemMatch}` no filtro |
| Um item por lote no pedido | `ON CONFLICT DO UPDATE` | `$inc` no item existente ou `$push` com `$ne` |
| Reserva só na primeira vez | `WHERE reservado_ate IS NULL` | `reservadoAte: null` no filtro |
| Decidir cancelamento uma vez | `WHERE status = 'solicitado'` | `$elemMatch: {status: 'solicitado'}` no filtro |
| Lote com venda não muda | leitura + `UPDATE` | `vendidos: 0` no filtro |

### Integridade referencial

O MongoDB não tem chave estrangeira. As regras que as FKs da Fase 1 davam e
que a aplicação usa foram reproduzidas no repositório:

| FK da Fase 1 | Efeito | Equivalente |
|---|---|---|
| `lote.evento_id ON DELETE CASCADE` | excluir evento leva os lotes | lotes embutidos saem com o documento |
| `cupom_evento ON DELETE CASCADE` | excluir evento desfaz o vínculo | `$pull` de `eventosIds` em `excluir` |
| `item_pedido.lote_id` (restrict) | lote/evento em pedido não pode sumir | `countDocuments` em `pedidos` antes de `excluirLote`/`excluir` |
| `inscricao`/`ingresso`/`check_in` (cascade em cadeia) | — | embutidos na inscrição |

## 11. Alterações nos testes

A Fase 1 não tinha testes automatizados. A migração adicionou uma suíte de
integração com **Vitest** (`tests/integracao/`, 44 testes) que roda contra o
MongoDB real:

- `tests/preparar-banco.ts` apaga e recria o database `ducktix_test` com o
  **mesmo `criar-banco.js` da entrega** — os testes também validam os
  validadores e os índices.
- `identidade.test.ts` — CRUD de usuário, e-mail duplicado (índice único),
  rejeição pelo `$jsonSchema`, tokens.
- `catalogo.test.ts` — criação com lotes e categoria embutidos,
  find-or-create do organizador, slug único, filtros da vitrine, edição,
  exclusão com vínculos, regras de lote e **12 vendas simultâneas num lote
  de 5 vagas** (exatamente 5 passam).
- `vendas.test.ts` — carrinho, itens concorrentes, troca de método de
  pagamento, **checkout completo pela camada de aplicação**, cupom por
  evento, limite de uso com concorrência.
- `participacao.test.ts` — paginação, busca (inclusive com caracteres
  especiais de regex), portaria (aceito, repetido, outro evento, inexistente),
  **check-in duplo simultâneo**, presentes/ausentes, relatório de
  participação, fluxo de cancelamento.

## 12. Como executar o MongoDB

```bash
docker compose up -d mongo          # MongoDB 8 em localhost:27017
docker compose up -d mongo-express  # opcional: interface web em localhost:8081
```

Sem Docker: MongoDB Community 7+ local ou um cluster Atlas — basta ajustar
`MONGODB_URI`. Detalhes no [README](../../README.md#2-passo-a-passo-para-executar).

## 13. Como executar a aplicação

```bash
cp .env.example .env.local
pnpm install
pnpm db:setup      # collections, validação, índices
pnpm db:seed       # dados de demonstração
pnpm build && pnpm start      # ou pnpm dev
```

Contas de demonstração: senha `ducktix123` (lista no README, seção 2.7).

## 14. Como validar a migração

1. **Tipos e build:** `pnpm exec tsc --noEmit` e `pnpm build` sem erros.
2. **Testes:** `pnpm test` → 44 testes passando.
3. **Fidelidade dos dados:** a conferência da seção 2.5 do README devolve
   30 eventos, 8.864 inscrições ativas e 4.779 check-ins — os mesmos números
   do PostgreSQL da Fase 1.
4. **Fluxo na interface (validado durante a migração):**
   - participante: login → evento pago → carrinho → dados e cobrança → Pix →
     confirmação → *Meus ingressos* → solicitar cancelamento;
   - organizador: todas as abas do evento → aceitar o cancelamento (inscritos
     e cancelados atualizam) → busca e paginação de inscritos → check-in
     manual (aceito, depois recusado como "já utilizado") → filtro de
     presentes → criar cupom → criar lote;
   - cadastro de conta nova e recusa de e-mail repetido.
5. **Sem PostgreSQL:** com o container do Postgres parado e sem
   `DATABASE_URL`, a aplicação funciona; nenhum arquivo em `src/` importa
   `drizzle-orm`, `postgres` ou `@neondatabase/serverless`.

## 15. Limitações e diferenças conhecidas

- **Sem transação entre collections.** A confirmação do pedido executa, em
  sequência, o uso do cupom, a baixa de estoque, a emissão dos ingressos e a
  confirmação. Cada passo é atômico, mas uma falha no meio deixa os
  anteriores gravados. **Isso já era assim na Fase 1**: cada método do
  repositório tinha sua própria transação e o caso de uso não envolvia os
  quatro numa só. Habilitar *replica set* e envolver o caso de uso numa
  sessão com `withTransaction` resolveria nas duas fases.
- **Integridade referencial é da aplicação.** Um `deleteOne` feito à mão no
  `mongosh` não propaga nem é barrado como uma FK. Pela aplicação, as regras
  da seção 10 valem.
- **Cópias desnormalizadas** (nome do organizador, nome do lote, datas do
  pedido) dependem das regras descritas na seção 8.
- **Unicidade dentro de arrays** é garantida no filtro do update, não por
  índice: uma escrita manual que ignore o filtro pode criar duplicatas.
- **Busca de inscritos** usa `$regexMatch` sobre a concatenação dos campos
  (equivalente ao `ILIKE '%termo%'`, que também não usava índice). Para
  volumes muito maiores, um índice de texto ou o Atlas Search seriam o
  próximo passo.
- **Colunas descartadas:** `participante.usuario_id` (nenhuma consulta o
  lia) e o vínculo `check_in.operador_id → usuario` (sempre nulo; o campo
  `operadorId` continua no documento).
- **Deploy:** a versão publicada na Vercel continua sendo a da Fase 1
  (Neon). Publicar a Fase 2 exige um cluster MongoDB Atlas e as variáveis
  `MONGODB_URI`/`MONGODB_DB` no projeto da Vercel — fora do escopo desta
  entrega, que é demonstrada localmente.
