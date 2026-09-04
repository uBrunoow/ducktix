# Handoff: Ducktix — persistência com Drizzle/Postgres e refactor visual do back-office

**Data:** 2026-09-03
**Status:** em andamento — duas frentes paralelas, nenhuma iniciada
**Prazo rígido:** entrega e defesa em **24/09/2026, 19h00** (ausência zera o trabalho)

---

## 1. Objetivo

Ducktix é um sistema de gestão de eventos, ingressos e participantes — trabalho
da Fase 1 de Banco de Dados II (UDESC). O modelo relacional, o banco populado e
a interface já existem, mas **a aplicação ainda roda com repositórios em
memória**: o banco PostgreSQL foi criado e validado, e nada no código o usa.

Esta sessão tem duas frentes:

1. **Persistência real** — subir Postgres via docker-compose de desenvolvimento
   e implementar os repositórios Drizzle contra os *ports* que já existem.
2. **Refactor visual do back-office** — as telas de `/organizer` foram
   reconstruídas do zero nesta sessão (de stubs para um painel funcional), mas
   **o resultado ainda não agradou o usuário**. Precisa de uma nova direção
   visual, não de ajustes pontuais.

---

## 2. Contexto essencial

### Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15.5.4 (App Router) + TypeScript strict |
| UI | Tailwind CSS v4 + shadcn/ui (estilo `new-york`) |
| Formulários | react-hook-form + zod |
| Banco (alvo) | PostgreSQL 16 + Drizzle ORM |
| Deploy previsto | Vercel + Neon (free tier) |

**Não instalado ainda:** `drizzle-orm`, `drizzle-kit`, driver Postgres,
`docker-compose.yml`, `.env`. O `package.json` tem só os scripts padrão do Next.

### Arquitetura — a restrição que governa tudo

O código segue DDD lite em camadas, por bounded context:

```
src/server/<contexto>/
  domain/            regras puras — sem SQL, HTTP ou React
  application/       casos de uso — orquestram domínio + ports
  ports/             interfaces de repositório
  infrastructure/    implementações concretas (hoje: em memória)
```

Contextos: `identity`, `event`, `ticketing`, `participation`.

**Isto é o que torna a Fase 2 (NoSQL) uma troca de `infrastructure/`.** A troca
para Drizzle não pode alterar `domain/` nem `application/` — se alterar, a
arquitetura falhou.

### Restrições de design (obrigatórias)

O design system está em `ducktix/docs/DESIGN.md` e é **autoridade**:

- **Um único acento: amarelo `#FFD400`**, em dois papéis que nunca se trocam —
  `--brand` preenche (texto preto por cima), `--brand-ink` (`#7A5C00`) é tinta
  de texto. Nunca introduzir segunda cor de acento.
- Tema **claro apenas**. Não existe dark mode.
- Tudo é **pill** (`border-radius: 9999px` em botões/chips); cards usam `1rem`.
- Tipografia: **Onest** para títulos (`.display`), **Inter Tight** para o resto.
  Nunca mono para título.
- Consequência prática: **paleta categórica multicolorida é proibida**. Todo
  gráfico do painel é série única em amarelo, com valores em tinta de texto.

### Restrições da disciplina (afetam decisões técnicas)

- CRUD completo (**incluindo remoção**) de todas as tabelas de entidade.
- Processo de negócio para **todas** as tabelas associativas (são 6).
- Mínimo 3 relatórios com JOIN de mais de uma tabela.
- **REST não é aceito como interface final** — a interface é a aplicação
  gráfica. Não criar `src/app/api/`.
- Simplificar o domínio é penalizado na nota.

---

## 3. O que já foi feito

Ordem cronológica das sessões anteriores.

### 3.1 Telas do participante

- `/my-tickets` — lista de ingressos com capa, data, status e link para detalhe.
- `/my-tickets/[id]` — **nova**: cartão de ingresso com QR real (server-side,
  lib `qrcode`), recorte perfurado, e detalhamento de evento/participante.
- Checkout redesenhado nas 3 etapas:
  - Etapa 1: contexto do evento no topo, participantes em **acordeão** (com 5
    ingressos eram 5 fieldsets idênticos empilhados), cupom movido para dentro
    do resumo.
  - Etapa 2: **QR de Pix real e escaneável**, boleto com linha digitável de 47
    dígitos e botão de copiar. Códigos em
    `src/server/ticketing/domain/codigos-simulados.ts`, marcados como sintéticos.
  - Etapa 3: cards de ingresso clicáveis.
- `PassosDoFluxo` — trilha de progresso compartilhada entre checkout e
  assistente de evento.

### 3.2 Sidebar do organizador → shadcn

Substituída pela `Sidebar` oficial do shadcn/ui. Ganhou recolher-para-ícones com
tooltip, gaveta no mobile, atalho ⌘/Ctrl+B, estado em cookie e alça de arrastar.

Cuidados tomados que **precisam ser repetidos se rodar o instalador de novo**:
- Recusar sobrescrever `button.tsx` (tem a variante `inverso` e o amarelo).
- O instalador anexa um bloco `.dark` com paleta azul no `globals.css` —
  **removido de propósito**, há nota no arquivo.
- Textos de leitor de tela vinham em inglês; traduzidos.

### 3.3 Back-office reconstruído (⚠️ visual não aprovado)

Três de quatro páginas eram stubs "Em construção". Agora existem:

| Rota | O que faz |
|---|---|
| `/organizer` | Painel: receita, pedidos, participantes, check-ins, ocupação, receita por mês e categoria, próximos eventos |
| `/organizer/events` | Lista com filtros (todos/próximos/realizados/rascunhos), ocupação e receita por evento |
| `/organizer/events/[id]` | **Nova** — curva de vendas, desempenho por lote, cupons aceitos, **lista nominal de participantes** com busca e paginação server-side |
| `/organizer/events/[id]/edit` | **Nova** — edição real (era stub) |
| `/organizer/coupons` + `/new` + `/[id]` | **Novas** — CRUD de cupom e uso por evento |
| `/organizer/reports/events` | Os 3 relatórios (era stub) |

### 3.4 Dados sintéticos de inscrições

O seed só tinha `vendidos` por lote (um número). Sem linha por pessoa não existe
lista de participante nem check-in. Criado
`src/server/participation/infrastructure/seed-inscricoes.ts`: gerador
determinístico (LCG com semente do slug) que deriva ~9.100 inscrições de
`lote.vendidos`, com taxa de presença 68–92% por evento e ~3% de cancelamento.

**Também foi ajustado o calendário do seed:** todos os 30 eventos estavam no
futuro, então check-in e presença eram permanentemente zero. 16 eventos foram
recuados para junho/2026. O campo `mes` do seed é **índice base zero** do
JavaScript — `8` é setembro, não agosto (documentado no arquivo).

### 3.5 Modelo de dados e documentação

- `ducktix/docs/modelo-conceitual.md` — ER + cardinalidades + regras
- `ducktix/docs/modelo-logico.md` — dicionário de dados, normalização, índices
- `ducktix/docs/modelo-mudancas.md` — o que mudou vs. o modelo previsto e por quê
- `ducktix/db/schema.sql` — DDL (18 tabelas), **aplicado e validado**
- `ducktix/db/seed.sql` + `backup.sql` — **restauração testada em base limpa**
- `ducktix/db/gerar-seed.mjs` — gera o SQL a partir da fixture da aplicação
- `documento_entrega_fase1.md` — reescrito, mapeado aos itens do enunciado
- `ducktix/README.md` — instruções de execução (entregável 2c, não existia)
- Diagrama ER exportado em `docs/diagramas/`

### 3.6 Decisões de modelagem tomadas (e o porquê)

| Decisão | Motivo |
|---|---|
| `ticket_batches` + `ticket_types` → uma tabela `lote` | Dois níveis sempre teriam uma linha só embaixo, e o contador de estoque ficaria ambíguo. **É a única simplificação do modelo** — há nota de como reverter se a professora questionar |
| `registrations` → `inscricao`, criada para todo ingresso | Dois caminhos para "quem está neste evento?" obrigariam `UNION` em todo relatório |
| `participante` não exige conta (`usuario_id` nulável) | O checkout permite ingresso nominal a terceiros |
| Dinheiro em `INTEGER` centavos | Ponto flutuante acumula erro |
| `evento.local` é texto livre (tabela `local` **descartada** a pedido do usuário) | A plataforma não cadastra locais reutilizáveis |
| `dados_cobranca` → colunas de `pedido` | 1:1, nunca lido sem o pedido |
| `dados_profissionais` → colunas de `participante` (**não** de pedido) | Um pedido com 4 ingressos tem 4 conjuntos, um por pessoa — no pedido, três se perderiam |

### 3.7 Descartado

- **`motion` (motion.dev)** — instalado para animar o stepper, depois
  **removido**. A mola de JS congelou em `width: 40.18%` quando a aba perdeu
  foco (rAF pausa) e **não se recuperou sozinha**. Num indicador de progresso
  isso faz a barra mentir permanentemente. Substituído por transição CSS com
  `scaleX`, que é declarativa e não trava. Se alguém sugerir motion/anime.js
  para o stepper de novo, **este é o motivo de não**.
- **Busca por um stepper pronto** em motion.dev, skiper-ui.com, animejs.com e
  animmasterlib.dev — **nenhum dos quatro tem stepper**. São bibliotecas de
  animação e de efeitos de marketing. Não repetir a busca.
- **Tabela `local`** — modelada e depois removida a pedido do usuário.

### 3.8 Bugs corrigidos no caminho

Todos verificados no navegador:

- Carrinho travado: pedido aberto com reserva vencida era reaproveitado para
  sempre, sem saída pela interface. Agora é cancelado e um novo é criado.
- Cupom aplicava no servidor mas o total não mudava (faltava `revalidatePath`).
- Hidratação quebrada: `ContadorDeReserva` computava `Date.now()` no render.
- Gráfico de barras invisível: `items-end` colapsava a altura da coluna.
- Scroll horizontal no painel: grid com `min-width: auto`.
- Mês errado no badge: pt-BR formata "03 de out. de 2026" e o split pegava "de".
- Validade de cupom um dia atrás: `new Date('2026-01-01')` é UTC.

---

## 4. Estado atual

### Funciona

- `npm run build` passa. `npx tsc --noEmit` limpo.
- Todas as 21 rotas retornam 200.
- Fluxo de compra completo, testado ponta a ponta: evento → carrinho → checkout
  → cupom (R$ 80 → −R$ 8 → R$ 72) → pagamento → ingressos emitidos.
- Banco: `schema.sql` + `seed.sql` aplicam limpos; `backup.sql` restaura em base
  nova. Números batem com a tela: **30 eventos, 8.864 inscrições ativas, 4.779
  check-ins, R$ 730.715,00**.
- Constraints do banco testadas e barrando: estoque do lote, coerência
  modalidade×local, cobrança obrigatória em pedido confirmado, teto de cupom,
  um check-in por ingresso.
- Os 3 relatórios rodam em SQL puro sobre o esquema.

### Não funciona / não existe

- **Nada da aplicação usa o Postgres.** Tudo em memória, em `globalThis`.
- **Não existe operação de exclusão em lugar nenhum do sistema.** O enunciado
  define CRUD incluindo remoção.
- **Check-in não tem processo de negócio na aplicação** — é a 6ª tabela
  associativa; os dados existem no banco mas não há a operação de portaria.
- Sem CRUD: `categoria`, `organizador`, `pagamento`,
  `cancelamento_de_inscricao`.
- **12 arquivos com marcador `TEMPORÁRIO`** — checagem de sessão desativada para
  permitir navegar sem login. Precisa ser reativada.
- **O visual do `/organizer` não agradou.** Funciona, mas o usuário quer um
  refactor de direção, não polimento.

### Servidores rodando

Havia dois `next dev` durante a sessão: um de outra conversa na **porta 3000** e
um meu na **3100**. Ambos podem estar ativos. O estado em memória vive em
`globalThis`, então **mudanças no seed só valem após reiniciar o servidor**.

---

## 5. Próximos passos

### Frente A — Persistência (Drizzle + docker-compose)

1. **docker-compose de dev.** Criar `ducktix/docker-compose.yml` com Postgres 16
   e volume nomeado. Porta sugerida **5433** para não colidir com Postgres local.
   Criar `.env.local` com `DATABASE_URL` e `.env.example` versionado.
2. **Instalar dependências:**
   `npm i drizzle-orm postgres` e `npm i -D drizzle-kit`.
   Para dev local use o driver `postgres` (postgres.js); o
   `@neondatabase/serverless` fica para o deploy na Vercel — dá para manter os
   dois atrás da mesma factory de conexão.
3. **Schema Drizzle** em `src/server/db/schema.ts`, espelhando
   `db/schema.sql` (a fonte da verdade do dicionário de dados é o SQL — se
   divergirem, o documento de entrega fica errado). Configurar `drizzle.config.ts`.
4. **Decidir migrations vs. SQL existente.** O `schema.sql` já existe e está
   validado. Duas opções: (a) `drizzle-kit generate` a partir do schema TS e
   descartar o SQL manual, ou (b) manter o SQL como canônico e usar
   `drizzle-kit introspect`. **Ver pergunta 6.1.**
5. **Implementar os repositórios**, um contexto por vez, na ordem:
   `identity` → `event` → `ticketing` → `participation`. Os *ports* já definem
   exatamente o contrato (lista completa na seção 7).
   **Regra:** nenhum arquivo em `domain/` ou `application/` pode mudar.
6. **Transação na venda.** `confirmarPedido` hoje chama `registrarVenda` num
   laço. Em Postgres isso vira **uma transação** com
   `SELECT ... FOR UPDATE` na linha do lote — é o requisito de concorrência
   destacado no documento de entrega.
7. **Reativar as checagens de sessão** — os 12 `TEMPORÁRIO`.
8. **Substituir `seed-inscricoes.ts`** pela leitura real da tabela `inscricao`.

### Frente B — Refactor visual do `/organizer`

9. **Descobrir o que incomoda antes de redesenhar.** O usuário disse "não me
   convenceu" duas vezes; a segunda depois de uma reconstrução completa.
   Perguntar objetivamente: é densidade? hierarquia? o amarelo dominando os
   gráficos? parecer genérico? **Não redesenhar no escuro de novo.**
10. **Considerar rodar `/impeccable` no modo de nova direção visual** para o
    back-office, tratando-o como superfície própria (modo *Operate*) em vez de
    herdar a vitrine. O layout do organizador tem contrato de direção próprio em
    `src/app/(private)/organizer/layout.tsx` (constante `CONTRATO_DE_DIRECAO`).
11. **Telas que ainda faltam desenhar** (hoje inexistentes):
    - check-in / portaria (tem QR scanner? entrada manual de código?)
    - CRUD de categoria
    - CRUD de organizador / perfil público do organizador
    - fluxo de cancelamento de inscrição e reembolso
    - confirmações de exclusão (não existe nenhuma)
    - estados de erro e vazio do back-office

### Frente C — Lacunas da nota (decidir prioridade)

12. **Check-in** — maior retorno: é associativa exigida e rende demonstração
    forte na defesa (ler QR → validar → marcar presença).
13. **Operações de remoção** em todas as entidades.
14. **CRUD de `categoria` e `organizador`**.

---

## 6. Perguntas em aberto

1. **Drizzle como fonte da verdade do schema, ou o `schema.sql`?** O SQL está
   validado e é o que o documento de entrega descreve. Gerar migrations a partir
   do TS pode divergir do dicionário de dados entregue.
2. **O que exatamente desagrada no visual do `/organizer`?** Sem isso, o próximo
   redesign tem a mesma chance de errar.

https://www.figma.com/design/RGGK7ZIOAuQjWPibJk9eT5/SAAS-Event-Management-Dashboard-UI-Kit--Preview-?node-id=330-8596&p=f&t=l8lR9AGYOnKbo7Iv-0

https://www.figma.com/design/QReUiHgSxPTrMwSt0d285V/Tickety---SaaS-Event-Ticket-Website-App-Dashboard-UI-Kit--Preview-?node-id=0-1&p=f&t=nKNUQBMA8ZXhifHA-0

O que não me agrada dentro é que hoje não tem uma cara de Painel de Dashboard de organizador ele não consegue fazer muita coisa, não consegue ver muita coisa, não consegue tirar dados confiáveis, em ambos os figmas acima além de conseguir ter uma visão melhorada de gráficos, informações eu consigo ter um design adequado para essas questões entende?

3. **Check-in: qual a interação?** Câmera lendo QR, digitação do código, ou
   busca por nome na lista? Muda bastante o desenho da tela.

Câmera lendo o QRCode

4. **Exclusão é física ou lógica?** Apagar um evento com ingressos vendidos
   destrói histórico. Provavelmente `status = 'cancelado'` + `deleted_at`, mas o
   enunciado pede "remoção (delete)" — vale confirmar com a professora o que
   conta.

Podemos fazer CRUD (Delete) de apenas algumas coisas outras podemos manter como soft-delete

5. **Docker Compose sobe só o Postgres ou a aplicação também?** Para
   desenvolvimento, só o banco costuma bastar (Next roda no host).

Sobe apenas pgadmin e postgres para desenvolvimento local.

6. **Neon no deploy?** Se sim, o driver precisa ser trocado por ambiente.

Sim usaremos Neon como database na "prod"

7. **A dupla simplificação `lote`** (fusão de lote + tipo de ingresso) fica ou
   volta a dois níveis? Já está documentada com o caminho de volta.

Não lembro como eu modelei isso mas acho que por hora apenas 1 evento pode ter N lotes mas 1 Lote pertence a 1 evento

---

## 7. Artefatos relevantes

### Documentos (ler primeiro)

| Arquivo | Para quê |
|---|---|
| `readme.md` (raiz) | **Enunciado oficial da professora** |
| `documento_entrega_fase1.md` | Documento de entrega; seção 8 lista as pendências |
| `ducktix/docs/modelo-logico.md` | Dicionário de dados — contrato do schema |
| `ducktix/docs/modelo-mudancas.md` | Decisões de modelagem e seus motivos |
| `ducktix/docs/DESIGN.md` | **Autoridade visual** — ler antes de mexer em UI |
| `ducktix/README.md` | Execução e roteiro de demonstração |
| `PRODUCT.md` (raiz) | Contexto de produto e usuários |

### Ports a implementar com Drizzle

```
event/ports/catalogo-publico.ts
  listarPublicados · listarTodos · buscarPorId · registrarVenda
  criar · publicar · atualizar

identity/ports/usuarios.ts
  buscarPorEmail · buscarPorId · criar · atualizarSenha · atualizarNome
  atualizarEmail · atualizarCpfCnpj · atualizarFoto
  criarTokenDeRedefinicao · buscarTokenDeRedefinicao · invalidarTokenDeRedefinicao

ticketing/ports/pedidos.ts
  criarAberto · buscarPorId · buscarAbertoPorParticipante · adicionarItem
  definirCupom · atualizarStatus · garantirReserva · definirParticipantes
  definirCobranca · definirMetodoPagamento · listarPorParticipante

ticketing/ports/cupons.ts
  buscarPorCodigo · buscarPorId · listarTodos · criar · definirAtivo
  registrarUso · listarUsos · listarUsosPorEvento

participation/ports/ingressos.ts
  emitir · listarPorItensDePedido
```

### Repositórios em memória a substituir

```
event/infrastructure/seed-catalogo.ts          (30 eventos + lotes)
identity/infrastructure/memoria-usuarios.ts
ticketing/infrastructure/memoria-pedidos.ts
ticketing/infrastructure/memoria-cupons.ts     (4 cupons)
participation/infrastructure/memoria-ingressos.ts
participation/infrastructure/seed-inscricoes.ts (gerador ~9.100 inscrições)
participation/infrastructure/seed-preview.ts
identity/infrastructure/sessao.ts               (cookie; não precisa mudar)
```

Todos vivem em `globalThis` para sobreviver ao hot reload.

### Comandos

```bash
# banco de validação descartável (foi assim que o schema foi testado)
docker run -d --rm --name ducktix-pg \
  -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=ducktix -p 55432:5432 postgres:16-alpine

docker exec -i ducktix-pg psql -U postgres -d ducktix -v ON_ERROR_STOP=1 < ducktix/db/schema.sql
docker exec -i ducktix-pg psql -U postgres -d ducktix -v ON_ERROR_STOP=1 -q < ducktix/db/seed.sql

# conferência (valores esperados)
docker exec -i ducktix-pg psql -U postgres -d ducktix -t -A <<'SQL'
SELECT 'eventos', count(*)::text FROM evento
UNION ALL SELECT 'inscricoes ativas', count(*)::text FROM inscricao WHERE status='ativa'
UNION ALL SELECT 'check-ins', count(*)::text FROM check_in;
SQL
# → 30 | 8864 | 4779

# regerar seed a partir da fixture da aplicação
cd ducktix && node db/gerar-seed.mjs

# regerar backup
docker exec ducktix-pg pg_dump -U postgres --format=plain --no-owner --no-privileges ducktix > ducktix/db/backup.sql

# app
cd ducktix && npm run dev        # porta 3000 pode estar ocupada
npx tsc --noEmit && npm run build
```

### Dados de demonstração úteis

- Cupons: `PROMO10` (10%, todos os eventos), `PRIMEIROLOTE` (R$20 fixo,
  restrito), `INVERNO25` (expirado), `ESTUDANTE` (desativado).
- Evento com bons números: `corrida-da-lagoa-10k` — 901 inscritos, 789
  presentes, 88%, R$ 106.463.
- Eventos esgotados existem (`noite-de-jazz-no-porto`) — não servem para testar
  compra.

---

## 8. Instruções pra próxima sessão

### Tom e método

- **Português do Brasil.** Todo o código, comentários e documentação estão em
  pt-BR. Nomes de domínio em português (`Evento`, `Pedido`, `Inscricao`).
- **Verificar antes de afirmar.** O padrão desta sessão foi rodar `tsc`,
  `npm run build`, aplicar SQL num Postgres real e conferir no navegador antes
  de dizer que funciona. Vários bugs só apareceram assim.
- **Comentários explicam o porquê, não o quê.** O código tem comentários
  densos justificando decisões não óbvias. Manter esse padrão.
- **Ser direto sobre lacunas.** O usuário reagiu bem a receber a auditoria
  honesta do CRUD incompleto em vez de um documento otimista.

### Armadilhas

1. **Estado em `globalThis` sobrevive ao hot reload.** Mudou seed? Reinicie o
   servidor, senão você depura um fantasma.
2. **`mes` no seed é base zero.** `8` é setembro.
3. **Nunca introduzir segunda cor de acento.** Isso proíbe paleta categórica em
   gráficos — use série única.
4. **Não sobrescrever `button.tsx`** ao rodar `npx shadcn add`.
5. **Não criar `src/app/api/`** — REST é explicitamente recusado como interface
   final pelo enunciado.
6. **Não sugerir motion.dev/anime.js para o stepper** — já testado e revertido
   por travar em estado parcial (seção 3.7).
7. **`domain/` e `application/` não mudam** ao trocar a persistência. Se
   precisarem mudar, o desenho do port está errado.
8. **O browser pane trava com scroll via script.** Use `read_page`/
   `get_page_text` e leia o DOM em vez de tentar rolar.
9. **Timezone:** `new Date('2026-01-01')` é UTC e volta um dia no Brasil. Use o
   construtor por componentes.
10. **`seed.sql` é gerado.** Editar à mão é perder na próxima geração — mexa em
    `db/gerar-seed.mjs`.

### Por onde começar

Se o usuário não direcionar, sugerir nesta ordem:

1. Perguntar **o que incomoda no visual do `/organizer`** (pergunta 6.2) — é o
   único bloqueio que depende só dele e trava a Frente B inteira.
2. Enquanto isso, começar a **Frente A pelo docker-compose e pelo contexto
   `identity`** — é o menor, e valida o padrão de repositório Drizzle antes de
   replicar para os outros três.
3. Confirmar a decisão de **migrations vs. `schema.sql`** (pergunta 6.1) antes
   de escrever qualquer schema TS.
