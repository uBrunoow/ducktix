# Ducktix

Aplicação web de gestão de eventos, venda de ingressos, participantes,
check-in e relatórios. Projeto da disciplina de Banco de Dados II — UDESC.

- **Fase 2 (este estado do repositório):** banco **NoSQL MongoDB**. O
  PostgreSQL da Fase 1 foi substituído; a aplicação não depende mais dele.
- Relatório da migração (modelo de documentos, decisões, consultas SQL →
  MongoDB): [`ducktix/docs/migracao-postgresql-mongodb.md`](ducktix/docs/migracao-postgresql-mongodb.md)
- Documento da entrega da Fase 1 (domínio, esquema relacional, dicionário de
  dados): [`ENTREGA.md`](ENTREGA.md)

## Onde está cada item da entrega (Fase 2)

| Item do enunciado | Onde está |
|---|---|
| (a) Código-fonte da aplicação | [`ducktix/src/`](ducktix/src) |
| (b) Scripts de criação do banco de dados | [`ducktix/database/criar-banco.js`](ducktix/database/criar-banco.js) — collections, validação e índices · [`ducktix/database/scripts/seed.mjs`](ducktix/database/scripts/seed.mjs) — dados iniciais · ver [`ducktix/database/README.md`](ducktix/database/README.md) |
| (c) Instruções de compilação e execução | este arquivo |

Nenhum arquivo do repositório está compactado.

Estrutura do repositório:

```text
README.md                 este arquivo (instruções)
ENTREGA.md                documento da entrega da Fase 1
ducktix/                  a aplicação
  src/                    código-fonte (Next.js + TypeScript)
  database/               scripts do MongoDB (criação do banco e seed)
    legacy-postgres/      artefatos da Fase 1 (DDL, backup) — histórico e fonte do seed
  tests/                  testes de integração contra o MongoDB
  docs/                   documentação técnica e diagramas
```

---

## 1. O que precisa estar instalado

| Ferramenta | Versão | Para quê | Como conferir |
|---|---|---|---|
| **Git** | qualquer recente | baixar o repositório | `git --version` |
| **Node.js** | **20 ou mais novo** (testado no 24) | compilar e executar a aplicação e os scripts do banco | `node --version` |
| **pnpm** | 10 ou mais novo | instalar as dependências | `pnpm --version` |
| **Docker** com **Docker Compose** | Docker 24+ / Compose v2 | rodar o MongoDB 8 sem instalá-lo | `docker --version` e `docker compose version` |

Não é preciso instalar o MongoDB: o Docker baixa e roda o MongoDB 8. Se você
preferir não usar Docker, veja a
[seção 5](#5-alternativa-sem-docker-mongodb-instalado-no-computador).

Se algum comando da coluna "Como conferir" responder *command not found* (ou
"não é reconhecido como comando"), instale a ferramenta seguindo o
[guia de instalação](#6-guia-de-instalação-das-ferramentas) no fim deste arquivo.

---

## 2. Passo a passo para executar

Os comandos funcionam no Linux, no macOS e no Windows (PowerShell ou Git Bash).
Onde o Windows é diferente, está indicado.

### 2.1 Baixar o código

```bash
git clone https://github.com/uBrunoow/ducktix.git
cd ducktix/ducktix
```

A pasta `ducktix/ducktix` é a da aplicação. **Todos os comandos seguintes
são executados dentro dela.**

### 2.2 Subir o MongoDB

Abra o Docker Desktop (Windows/macOS) e espere ele indicar que está rodando.
Depois:

```bash
docker compose up -d mongo
```

Isso cria um MongoDB 8 acessível em `localhost:27017`, sem autenticação (é só
para desenvolvimento). Espere uns 10 segundos e confira se ele está pronto:

```bash
docker compose ps
```

A coluna `STATUS` deve mostrar `healthy`.

### 2.3 Configurar a aplicação

Copie o arquivo de exemplo de configuração:

```bash
cp .env.example .env.local
```

No Windows (PowerShell): `Copy-Item .env.example .env.local`.

Não é preciso editar nada: o `.env.example` já aponta para o MongoDB do passo
2.2.

| Variável | Valor padrão | Para quê |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017` | endereço do servidor MongoDB |
| `MONGODB_DB` | `ducktix` | nome do database usado pela aplicação |
| `BLOB_READ_WRITE_TOKEN`, `RESEND_*`, `APP_URL` | vazios / exemplo | serviços externos opcionais (seção 3) |

### 2.4 Instalar as dependências

```bash
pnpm install
```

Baixa as bibliotecas (leva alguns minutos na primeira vez). O aviso *Ignored
build scripts: sharp* no fim é normal e pode ser ignorado.

### 2.5 Criar o banco e carregar os dados

```bash
pnpm db:setup     # cria as collections, a validação ($jsonSchema) e os índices
pnpm db:seed      # carrega os dados de demonstração
```

- `db:setup` executa [`database/criar-banco.js`](ducktix/database/criar-banco.js).
  No MongoDB não existe `CREATE TABLE`: o database nasce na primeira escrita.
  O script cria as 7 collections explicitamente, com as regras de validação
  que fazem o papel dos `NOT NULL`/`CHECK` do PostgreSQL, e os índices (únicos
  e de consulta). Ele é idempotente — rodar de novo só atualiza.
- `db:seed` converte o backup da Fase 1
  (`database/legacy-postgres/backup.sql`, lido como texto — **não precisa de
  PostgreSQL**) nos documentos do MongoDB. Os ids originais são mantidos.
- Para apagar os dados e carregar de novo: `pnpm db:reset`.

O mesmo script de criação também roda direto no `mongosh` (o shell do
MongoDB), sem Node:

```bash
docker compose exec mongo mongosh ducktix /database/criar-banco.js
```

Conferência:

```bash
docker compose exec mongo mongosh ducktix --quiet --eval 'printjson({eventos: db.eventos.countDocuments(), inscricoesAtivas: db.inscricoes.countDocuments({status: "ativa"}), checkIns: db.inscricoes.countDocuments({checkIn: {$ne: null}})})'
```

Resultado esperado: **30 eventos, 8864 inscrições ativas, 4779 check-ins** —
os mesmos números da Fase 1.

### 2.6 Compilar e executar

```bash
pnpm build
pnpm start
```

Abra <http://localhost:3000> no navegador. Para parar, use `Ctrl+C` no
terminal.

Para desenvolvimento (recarrega sozinho ao editar o código), use `pnpm dev` no
lugar de `pnpm build` e `pnpm start`.

### 2.7 Contas de demonstração

Todas as contas do banco de demonstração usam a senha **`ducktix123`**.

| Perfil | E-mail | O que dá para ver |
|---|---|---|
| Organizador | `prefeitura-de-urubici@example.com` | *Festival de Inverno Tardio*: evento pago já realizado, com 1.084 inscritos, check-ins e cupom — o mais completo para ver os relatórios |
| Organizador | `instituto-camada-nove@example.com` | 2 eventos pagos, um deles com cupom |
| Organizador | `guilda-de-backend@example.com` | 2 eventos gratuitos |
| Organizador | demais `*@example.com` | 1 evento cada |
| Participante | `comprador@example.com` | compra de ingressos (os eventos futuros estão à venda) |

Para testar a compra com cupom: entre como organizador de um evento futuro,
crie um cupom na aba *Cupons* do evento e use o código no checkout. Um cupom
só vale no evento em que foi criado.

A lista completa de contas sai com:

```bash
docker compose exec mongo mongosh ducktix --quiet --eval 'db.usuarios.find({}, {email: 1, papel: 1, _id: 0}).sort({papel: 1, email: 1}).forEach(printjson)'
```

Também é possível criar uma conta nova em `/register`.

### 2.8 Ver os documentos (opcional)

O `docker-compose.yml` traz o **mongo-express**, uma interface web para
navegar nas collections:

```bash
docker compose up -d mongo-express
```

Abra <http://localhost:8081> e escolha o database `ducktix`. O **MongoDB
Compass** (aplicativo oficial) também funciona: conecte em
`mongodb://localhost:27017`.

### 2.9 Testes

Os testes de integração rodam contra o MongoDB do passo 2.2, num database
separado (`ducktix_test`) que é apagado e recriado pelo próprio
`criar-banco.js` a cada execução — os dados de demonstração não são tocados.

```bash
pnpm test
```

São 44 testes cobrindo os 7 repositórios: CRUD, rejeição pela validação
`$jsonSchema` e pelos índices únicos, paginação e busca, o checkout completo
(carrinho → cupom → pagamento → ingressos) e as garantias de concorrência
(estoque do lote, check-in duplo, limite do cupom).

### 2.10 Encerrar

```bash
docker compose down          # para o banco e mantém os dados
docker compose down -v       # para o banco e APAGA os dados (para começar do zero)
```

---

## 3. Roteiro de demonstração

### Participante

| Fluxo | Rota |
|---|---|
| Descobrir eventos (busca, categorias, cidade) | `/events` |
| Detalhe do evento e seleção de lote | `/events/[slug]` |
| Participantes, cupom e cobrança | `/checkout/[id]` |
| Pagamento simulado (Pix ou boleto) | `/checkout/[id]/payment` |
| Ingressos agrupados por pedido | `/my-tickets` |
| Detalhe com QR Codes e pedido de cancelamento | `/my-tickets/[id]` |

### Organizador

| Fluxo | Rota |
|---|---|
| Painel com indicadores | `/organizer` |
| Eventos (ocupação e receita) | `/organizer/events` |
| Criar evento | `/organizer/events/new` |
| Visão geral do evento — relatórios de participação e vendas por lote | `/organizer/events/[id]` |
| Editar, publicar, cancelar ou excluir evento | `/organizer/events/[id]/edit` |
| Lotes (criar, editar e excluir sem vendas) | `/organizer/events/[id]/lotes` |
| Pedidos | `/organizer/events/[id]/orders` |
| Participantes (lista nominal, busca, presença) | `/organizer/events/[id]/attendees` |
| Check-in | `/organizer/events/[id]/check-in` |
| Cupons do evento — relatório de cupons | `/organizer/events/[id]/coupons` |
| Cancelamentos | `/organizer/events/[id]/cancellations` |

Os três relatórios são **por evento**, nas abas da página do evento.

### O que depende de serviços externos

A execução local não precisa de nenhuma conta externa. Três recursos usam
serviços da nuvem e, sem as chaves, ficam desligados sem quebrar o resto:

| Recurso | Variável em `.env.local` | Sem a chave |
|---|---|---|
| E-mail de confirmação do pedido | `RESEND_API_KEY` | o pedido é confirmado normalmente; o e-mail não é enviado |
| E-mail de redefinição de senha | `RESEND_API_KEY` | o link não é enviado |
| Upload de capa do evento e foto de perfil | `BLOB_READ_WRITE_TOKEN` | o evento é criado sem imagem |

---

## 4. Arquitetura NoSQL

O relatório completo está em
[`ducktix/docs/migracao-postgresql-mongodb.md`](ducktix/docs/migracao-postgresql-mongodb.md).
Resumo:

### Collections

As 18 tabelas da Fase 1 viraram **7 collections**. A modelagem partiu de como
a aplicação lê os dados (*access patterns*), não de uma cópia das tabelas.

| Collection | Tabelas de origem | Decisão |
|---|---|---|
| `usuarios` | `usuario`, `organizador` | organizador **embutido** (1:1, sempre lido junto) |
| `tokensRedefinicaoSenha` | `token_redefinicao_senha` | separada, com **índice TTL** que apaga tokens vencidos |
| `categorias` | `categoria` | separada (lista de filtros da vitrine) |
| `eventos` | `evento`, `lote`, `evento_categoria` | lotes e categorias **embutidos**; organizador como **referência estendida** (id + nome) |
| `cupons` | `cupom`, `cupom_evento`, `uso_de_cupom` | eventos válidos (`eventosIds`) e histórico de usos **embutidos** |
| `pedidos` | `pedido`, `item_pedido`, `pagamento` | itens, pagamentos e cobrança **embutidos** |
| `inscricoes` | `inscricao`, `participante`, `ingresso`, `check_in`, `cancelamento_de_inscricao` | um documento por ingresso nominal, com tudo embutido; **referencia** evento e pedido |

### Embedding × referencing

- **Embutido** quando os dados nascem, mudam e são lidos junto com o
  documento-pai e têm tamanho limitado: lotes de um evento, itens de um
  pedido, o ingresso e o check-in de uma inscrição.
- **Referência** quando o lado "muitos" cresce sem limite ou é consultado
  sozinho: as inscrições ficam fora do evento (um evento tem mais de mil) e
  fora do pedido (a lista de inscritos pagina por evento).
- **Cópia controlada** (desnormalização) só onde evita leitura extra em tela
  quente: nome do organizador no evento, nome do lote e datas do pedido na
  inscrição.

### Índices

Cada `UNIQUE`/`INDEX` relevante da Fase 1 tem equivalente em
`database/criar-banco.js` — por exemplo `uk_usuarios_email`,
`uk_eventos_slug`, `uk_inscricoes_codigo` (código do QR) e
`idx_inscricoes_evento` (lista de inscritos paginada).

### Integridade sem transações

O `SELECT ... FOR UPDATE` e as transações do PostgreSQL foram substituídos por
**atualizações condicionais atômicas em um único documento** — possível
justamente porque os dados que mudam juntos estão no mesmo documento:

| Regra | PostgreSQL (Fase 1) | MongoDB (Fase 2) |
|---|---|---|
| Não vender acima do estoque | `SELECT ... FOR UPDATE` + `UPDATE` | `updateOne` com `vendidos <= vagas - qtd` no filtro e `$inc` |
| Um check-in por ingresso | `INSERT ... ON CONFLICT DO NOTHING` | `updateOne` com `checkIn: null` no filtro |
| Limite de uso do cupom | transação `INSERT` + `UPDATE` | `$push` + `$inc` com `usos < limiteUso` no filtro |
| Lote com venda não muda | leitura + `UPDATE` | `vendidos: 0` no filtro do `$set`/`$pull` |

---

## 5. Alternativa sem Docker (MongoDB instalado no computador)

Com o MongoDB Community 7 ou 8 instalado e rodando (veja o
[guia](#64-mongodb-só-se-não-for-usar-docker)), o `.env.example` já aponta para
`mongodb://localhost:27017`. Siga a partir do passo
[2.3](#23-configurar-a-aplicação).

Um MongoDB Atlas (nuvem) também serve: troque `MONGODB_URI` em `.env.local`
pela *connection string* do cluster.

---

## 6. Guia de instalação das ferramentas

### 6.1 Git

- **Windows:** baixe em <https://git-scm.com/download/win> e instale com as
  opções padrão. Isso também instala o **Git Bash**, um terminal onde todos os
  comandos deste README funcionam.
- **macOS:** rode `git --version` no Terminal; se não estiver instalado, o
  sistema oferece instalar as *Command Line Tools*. Aceite.
- **Linux (Ubuntu/Debian):** `sudo apt install git`

### 6.2 Node.js e pnpm

Instale o **Node.js 20 ou mais novo** (versão LTS):

- **Windows e macOS:** baixe o instalador *LTS* em <https://nodejs.org> e
  instale com as opções padrão.
- **Linux (Ubuntu/Debian):** o Node do `apt` costuma ser antigo. Use o nvm:

  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  # feche e abra o terminal
  nvm install --lts
  ```

Feche e abra o terminal e confira com `node --version`.

O **pnpm** vem com o Node, só precisa ser ativado:

```bash
corepack enable
pnpm --version
```

Se o `corepack enable` der erro de permissão, use `npm install -g pnpm` (no
Linux/macOS pode ser preciso `sudo`).

> Sem pnpm, o npm (que vem com o Node) também funciona: troque `pnpm <comando>`
> por `npm run <comando>` (por exemplo `npm run db:setup`, `npm run build`) e
> `pnpm install` por `npm install`.

### 6.3 Docker

- **Windows:** instale o **Docker Desktop** em
  <https://docs.docker.com/desktop/setup/install/windows-install/>. Ele pede
  para ativar o **WSL 2**; aceite e reinicie o computador se solicitado. Abra o
  Docker Desktop e espere o ícone indicar *Engine running*.
- **macOS:** instale o **Docker Desktop** em
  <https://docs.docker.com/desktop/setup/install/mac-install/> (escolha Apple
  Silicon ou Intel conforme o seu Mac) e abra-o.
- **Linux:** siga <https://docs.docker.com/engine/install/> para a sua
  distribuição (instala o Docker Engine e o plugin Compose). Para rodar sem
  `sudo`: `sudo usermod -aG docker $USER`, depois saia e entre de novo na
  sessão.

Confira com `docker compose version`.

### 6.4 MongoDB (só se não for usar Docker)

- **Windows e macOS:** instale o *MongoDB Community Server* em
  <https://www.mongodb.com/try/download/community> (no Windows, deixe marcada
  a opção de instalar como serviço). O `mongosh` é instalado à parte:
  <https://www.mongodb.com/try/download/shell>. No macOS também dá para usar o
  Homebrew: `brew tap mongodb/brew && brew install mongodb-community`.
- **Linux:** siga <https://www.mongodb.com/docs/manual/administration/install-on-linux/>.

O `mongosh` é opcional: `pnpm db:setup` cria o banco pelo Node.

---

## 7. Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `Cannot connect to the Docker daemon` / `error during connect` | O Docker não está rodando. Abra o Docker Desktop e espere iniciar. |
| `port is already allocated` ao subir o banco | Algo já usa a porta 27017 (um MongoDB local, por exemplo). Pare esse serviço ou troque `27017:27017` em `docker-compose.yml` e a porta em `MONGODB_URI`. |
| `MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017` | O MongoDB não está no ar ou ainda não ficou `healthy`. Rode `docker compose ps` e espere. |
| `MONGODB_URI não definida` | Falta o `.env.local` (passo 2.3). |
| `A collection "..." já tem N documento(s)` ao rodar `db:seed` | O banco já tinha dados. Use `pnpm db:reset` para apagar e carregar de novo. |
| `Document failed validation` | Um documento violou a validação `$jsonSchema` — o equivalente a um `CHECK` do PostgreSQL. A mensagem mostra a regra. |
| `pnpm: command not found` | Rode `corepack enable` (seção 6.2) ou use npm. |
| Erro de sintaxe ao rodar `pnpm install` ou `pnpm build` | Node.js antigo. `node --version` precisa ser 20 ou mais novo. |
| `Port 3000 is in use` | Outra aplicação usa a porta. Rode `pnpm start -p 3001` (com npm: `npm start -- -p 3001`) e abra <http://localhost:3001>. |
| Login recusado com uma conta de demonstração | Confira se o seed rodou (passo 2.5) e se a senha é `ducktix123`. |
| No Windows, `cp` não é reconhecido | Use `Copy-Item .env.example .env.local` no PowerShell, ou o Git Bash. |

---

## 8. Tecnologias

- Next.js 15 (App Router) e React 19, TypeScript em modo strict
- **MongoDB 8** com o driver oficial `mongodb` para Node.js (sem ODM)
- Vitest para os testes de integração
- Tailwind CSS v4, Radix UI e Sonner

O backend é organizado por contexto em `ducktix/src/server/` (`identity`,
`event`, `ticketing`, `participation`), cada um com as camadas `domain`
(regras puras), `application` (casos de uso), `ports` (interfaces de
repositório) e `infrastructure` (MongoDB). A migração trocou só a camada
`infrastructure`: domínio, casos de uso e telas são os mesmos da Fase 1. A
interface é gráfica: as escritas passam por Server Actions do Next.js, não
por uma API REST.

## 9. Documentação técnica

| Documento | Conteúdo |
|---|---|
| [`ducktix/docs/migracao-postgresql-mongodb.md`](ducktix/docs/migracao-postgresql-mongodb.md) | relatório da migração para o MongoDB (Fase 2) |
| [`ducktix/database/README.md`](ducktix/database/README.md) | scripts do banco: criação, seed, índices |
| [`ENTREGA.md`](ENTREGA.md) | documento da entrega da Fase 1: domínio, esquema conceitual, dicionário de dados |
| [`ducktix/docs/README.md`](ducktix/docs/README.md) | índice da documentação técnica |
| [`ducktix/docs/diagramas/`](ducktix/docs/diagramas) | diagrama entidade-relacionamento (PNG, SVG e fonte Mermaid) |

Os dados de demonstração são sintéticos: nenhuma pessoa, organizador ou evento
existe, e os e-mails usam o domínio `example.com`, reservado e não entregável.
