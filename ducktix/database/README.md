# Banco de dados — MongoDB (Fase 2)

Scripts para criar e popular o banco MongoDB do Ducktix. Todos os comandos
abaixo rodam dentro da pasta `ducktix/` (a da aplicação), com o MongoDB no ar
(`docker compose up -d mongo`) e o `.env.local` criado a partir do
`.env.example`.

```text
database/
├── README.md             este arquivo
├── criar-banco.js        criação: collections, validação $jsonSchema e índices
├── scripts/
│   ├── criar-banco.mjs   executa criar-banco.js pelo driver Node (pnpm db:setup)
│   ├── seed.mjs          converte o backup da Fase 1 em documentos (pnpm db:seed)
│   └── ambiente.mjs      lê MONGODB_URI / MONGODB_DB do .env.local
└── legacy-postgres/      artefatos da Fase 1 (somente leitura)
    ├── schema.sql        DDL do PostgreSQL
    ├── seed.sql          dados em INSERTs
    ├── backup.sql        pg_dump em texto puro — fonte dos dados do seed
    ├── gerar-seed.mjs    gerador original dos dados sintéticos
    └── drizzle-migrations/
```

## Ordem de execução

| Passo | Comando | O que faz |
|---|---|---|
| 1 | `pnpm db:setup` | cria as 7 collections com validação e índices |
| 2 | `pnpm db:seed` | insere os dados de demonstração (falha se já houver dados) |
| — | `pnpm db:reset` | apaga os documentos e insere de novo |

O `db:seed` já roda o `criar-banco.js` antes de inserir, então o passo 1 é
opcional quando se vai popular o banco logo em seguida. Ele continua útil
sozinho para criar um banco vazio.

## Criação do banco (`criar-banco.js`)

No MongoDB não há `CREATE DATABASE` nem `CREATE TABLE`: o database e as
collections nascem na primeira escrita, sem estrutura. Para manter as
garantias que o PostgreSQL dava, o script cria tudo explicitamente:

1. **Collections com validador `$jsonSchema`** (`validationLevel: strict`,
   `validationAction: error`) — campos obrigatórios, tipos, tamanhos máximos,
   enums (`status`, `papel`, `modalidade`...) e mínimos numéricos. Fazem o
   papel dos `NOT NULL` e `CHECK` da Fase 1: um documento fora da regra é
   recusado pelo próprio banco, com erro `Document failed validation`.
2. **Índices** — únicos (o papel dos `PRIMARY KEY`/`UNIQUE`), de consulta e
   um **TTL** que apaga sozinho os tokens de redefinição de senha vencidos.

O script é idempotente: se a collection já existe, ele atualiza o validador
(`collMod`) e garante os índices, sem apagar dados.

Duas formas de executar o mesmo arquivo:

```bash
# pelo Node (não precisa de mongosh instalado; serve também para o Atlas)
pnpm db:setup

# pelo mongosh, dentro do container (a pasta database/ está montada em /database)
docker compose exec mongo mongosh ducktix /database/criar-banco.js

# pelo mongosh instalado no computador
mongosh "mongodb://localhost:27017/ducktix" database/criar-banco.js
```

O arquivo é escrito no estilo síncrono do `mongosh`; o runner Node
(`scripts/criar-banco.mjs`) oferece o mesmo `db` sobre o driver oficial.

### Índices

| Collection | Índice | Tipo | Equivalente na Fase 1 / uso |
|---|---|---|---|
| `usuarios` | `uk_usuarios_email` (`email`) | único | `usuario.email UNIQUE` — login |
| `tokensRedefinicaoSenha` | `ttl_tokens_expira_em` (`expiraEm`) | TTL | expira o token sem rotina de limpeza |
| `tokensRedefinicaoSenha` | `idx_tokens_usuario` | consulta | tokens de um usuário |
| `categorias` | `uk_categorias_nome`, `uk_categorias_slug` | único | `categoria.nome/slug UNIQUE` |
| `eventos` | `uk_eventos_slug` | único | `evento.slug UNIQUE` — URL pública |
| `eventos` | `idx_eventos_status_comeca` | consulta | vitrine: publicados por data (`idx_evento_status_comeca`) |
| `eventos` | `idx_eventos_destaque` | consulta | banner "em destaque" (`idx_evento_highlighted`) |
| `eventos` | `idx_eventos_organizador` | consulta | back-office do organizador (`idx_evento_organizador`) |
| `eventos` | `idx_eventos_categoria` | consulta | filtro por categoria (`idx_evento_categoria_cat`) |
| `cupons` | `idx_cupons_codigo_evento` | consulta | cupom digitado no checkout de um evento |
| `cupons` | `idx_cupons_usos_evento` | consulta | relatório de cupons por evento (`idx_uso_cupom_evento`) |
| `cupons` | `idx_cupons_criado` | consulta | listagem mais recentes primeiro |
| `pedidos` | `idx_pedidos_comprador` | consulta | carrinho aberto e "meus ingressos" (`idx_pedido_comprador`) |
| `pedidos` | `idx_pedidos_item` | consulta | emissão do ingresso a partir do item |
| `pedidos` | `idx_pedidos_lote`, `idx_pedidos_evento` | consulta | papel das FKs de `item_pedido`: lote/evento em pedido não pode ser excluído |
| `inscricoes` | `uk_inscricoes_codigo` | único | `ingresso.codigo UNIQUE` — leitura do QR na portaria |
| `inscricoes` | `uk_inscricoes_ingresso` | único | `ingresso.id` — detalhe do ingresso |
| `inscricoes` | `idx_inscricoes_evento` | consulta | lista de inscritos paginada (`idx_inscricao_evento`) |
| `inscricoes` | `idx_inscricoes_evento_cpf` | consulta | "este CPF já tem ingresso no evento" |
| `inscricoes` | `idx_inscricoes_checkin` | consulta | últimos check-ins da portaria |
| `inscricoes` | `idx_inscricoes_item_pedido`, `idx_inscricoes_pedido` | consulta | ingressos de um pedido |
| `inscricoes` | `idx_inscricoes_cancelamentos` | consulta | solicitações pendentes do evento |

O `_id` de cada collection é sempre indexado e único (o `PRIMARY KEY`).

## Dados iniciais (`scripts/seed.mjs`)

O seed lê `legacy-postgres/backup.sql` **como texto** — os blocos
`COPY ... FROM stdin` do `pg_dump` — e transforma os registros das 18
tabelas nos documentos das 7 collections. Não é preciso ter PostgreSQL.

- Os UUIDs da Fase 1 viram os `_id`: links, QR codes e sessões continuam
  válidos.
- Antes de inserir, roda o `criar-banco.js`, então **todo documento passa
  pela validação** — um erro de conversão aparece na hora, com a regra
  violada.
- Resultado: 29 usuários, 13 categorias, 30 eventos, 4 cupons, 3.643 pedidos
  e 9.111 inscrições — os mesmos totais da Fase 1 (8.864 inscrições ativas e
  4.779 check-ins).

## Consultar

```bash
docker compose exec mongo mongosh ducktix
```

```js
db.eventos.findOne({ slug: 'festival-de-inverno-tardio' })
db.inscricoes.countDocuments({ eventoId: '<id do evento>', checkIn: { $ne: null } })
db.cupons.aggregate([{ $unwind: '$historicoDeUsos' }, { $group: { _id: '$codigo', usos: { $sum: 1 } } }])
```

Interface gráfica: `docker compose up -d mongo-express` e
<http://localhost:8081>, ou o MongoDB Compass em `mongodb://localhost:27017`.

O modelo de documentos e as decisões estão em
[`../docs/migracao-postgresql-mongodb.md`](../docs/migracao-postgresql-mongodb.md).
