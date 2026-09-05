-- =============================================================================
-- Ducktix — Esquema lógico relacional (PostgreSQL 16)
--
-- DDL correspondente ao dicionário de dados em docs/modelo-logico.md.
-- Ordem de criação respeita as dependências de chave estrangeira.
--
-- Uso:
--   createdb ducktix
--   psql -d ducktix -f db/schema.sql
--   psql -d ducktix -f db/seed.sql
--
-- Backup (entregável 2b):
--   pg_dump --format=plain --no-owner --no-privileges ducktix > db/backup.sql
-- =============================================================================

BEGIN;

-- gen_random_uuid() vem do módulo pgcrypto (nativo no PostgreSQL 13+).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS cancelamento_de_inscricao CASCADE;
DROP TABLE IF EXISTS check_in                  CASCADE;
DROP TABLE IF EXISTS ingresso                  CASCADE;
DROP TABLE IF EXISTS inscricao                 CASCADE;
DROP TABLE IF EXISTS uso_de_cupom              CASCADE;
DROP TABLE IF EXISTS cupom_evento              CASCADE;
DROP TABLE IF EXISTS pagamento                 CASCADE;
DROP TABLE IF EXISTS item_pedido               CASCADE;
DROP TABLE IF EXISTS pedido                    CASCADE;
DROP TABLE IF EXISTS cupom                     CASCADE;
DROP TABLE IF EXISTS lote                      CASCADE;
DROP TABLE IF EXISTS evento_categoria          CASCADE;
DROP TABLE IF EXISTS evento                    CASCADE;
DROP TABLE IF EXISTS categoria                 CASCADE;
DROP TABLE IF EXISTS token_redefinicao_senha   CASCADE;
DROP TABLE IF EXISTS participante              CASCADE;
DROP TABLE IF EXISTS organizador               CASCADE;
DROP TABLE IF EXISTS usuario                   CASCADE;

-- -----------------------------------------------------------------------------
-- 1. Identidade
-- -----------------------------------------------------------------------------

CREATE TABLE usuario (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        VARCHAR(120) NOT NULL,
  email       VARCHAR(160) NOT NULL UNIQUE,
  senha_hash  VARCHAR(255) NOT NULL,
  papel       VARCHAR(20)  NOT NULL,
  cpf_cnpj    VARCHAR(14),
  foto_url    TEXT,
  criado_em   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT ck_usuario_papel CHECK (papel IN ('participante', 'organizador')),
  CONSTRAINT ck_usuario_documento CHECK (cpf_cnpj IS NULL OR length(cpf_cnpj) IN (11, 14))
);

COMMENT ON TABLE  usuario IS 'Conta de acesso ao sistema.';
COMMENT ON COLUMN usuario.papel IS 'Define a área do sistema: back-office ou vitrine.';

CREATE TABLE organizador (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
  nome_fantasia VARCHAR(140) NOT NULL,
  documento     VARCHAR(14),
  email_contato VARCHAR(160)
);

COMMENT ON TABLE organizador IS 'Especialização de usuário que publica eventos.';
COMMENT ON COLUMN organizador.usuario_id IS
  'Nulo para organizadores resolvidos só pelo nome de exibição do evento — o port de catálogo (event/ports/catalogo-publico.ts) recebe `organizador` como texto livre, sem o id de quem está logado. Ver docs/modelo-mudancas.md.';

CREATE TABLE participante (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID REFERENCES usuario(id) ON DELETE SET NULL,
  nome        VARCHAR(80)  NOT NULL,
  sobrenome   VARCHAR(80)  NOT NULL,
  email       VARCHAR(160) NOT NULL,
  celular     VARCHAR(20),
  nome_cracha VARCHAR(80),

  -- Dados profissionais: enriquecimento opcional coletado no checkout.
  -- Colunas do próprio participante, não tabela à parte — é 1:1 e sempre
  -- lido junto com o participante.
  linkedin    VARCHAR(200),
  github      VARCHAR(200),
  empresa     VARCHAR(140),
  segmento    VARCHAR(80),
  cargo       VARCHAR(80),
  nivel       VARCHAR(40)
);

COMMENT ON TABLE participante IS
  'Pessoa que ocupa a vaga. usuario_id é nulo quando o ingresso foi emitido para terceiro sem conta.';

CREATE TABLE token_redefinicao_senha (
  token      VARCHAR(120) PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  expira_em  TIMESTAMPTZ NOT NULL
);

-- -----------------------------------------------------------------------------
-- 2. Eventos
-- -----------------------------------------------------------------------------

CREATE TABLE categoria (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(60) NOT NULL UNIQUE,
  slug VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE evento (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizador_id UUID NOT NULL REFERENCES organizador(id),
  slug           VARCHAR(160) NOT NULL UNIQUE,
  nome           VARCHAR(140) NOT NULL,
  descricao      TEXT         NOT NULL,
  local          VARCHAR(160),
  modalidade     VARCHAR(12)  NOT NULL,
  formato_online VARCHAR(20),
  status         VARCHAR(12)  NOT NULL DEFAULT 'rascunho',
  visibilidade   VARCHAR(12)  NOT NULL DEFAULT 'publico',
  comeca_em      TIMESTAMPTZ  NOT NULL,
  termina_em     TIMESTAMPTZ  NOT NULL,
  imagem_url     TEXT,
  is_highlighted BOOLEAN      NOT NULL DEFAULT false,
  criado_em      TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT ck_evento_modalidade CHECK (modalidade IN ('presencial', 'online', 'hibrido')),
  CONSTRAINT ck_evento_formato CHECK (
    formato_online IS NULL
    OR formato_online IN ('ao-vivo', 'videoconferencia', 'desafio-virtual', 'conteudo-digital')
  ),
  CONSTRAINT ck_evento_status CHECK (status IN ('rascunho', 'publicado', 'encerrado', 'cancelado')),
  CONSTRAINT ck_evento_visibilidade CHECK (visibilidade IN ('publico', 'nao-listado')),
  CONSTRAINT ck_evento_periodo CHECK (termina_em > comeca_em),

  -- Evento online não tem local físico; presencial e híbrido exigem um.
  CONSTRAINT ck_evento_local_por_modalidade CHECK (
    (modalidade = 'online'  AND local IS NULL)
    OR (modalidade <> 'online' AND local IS NOT NULL)
  ),
  -- Online e híbrido precisam dizer como a parte online acontece.
  CONSTRAINT ck_evento_formato_por_modalidade CHECK (
    (modalidade = 'presencial' AND formato_online IS NULL)
    OR (modalidade <> 'presencial' AND formato_online IS NOT NULL)
  )
);

COMMENT ON COLUMN evento.local IS
  'Endereço em texto livre ("Joinville · SC"). Não há cadastro de locais reutilizáveis nesta fase.';
COMMENT ON COLUMN evento.slug IS
  'URL pública. Não acompanha o nome ao renomear: já pode estar em ingresso emitido ou link compartilhado.';

CREATE TABLE evento_categoria (
  evento_id    UUID NOT NULL REFERENCES evento(id)    ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES categoria(id) ON DELETE CASCADE,
  PRIMARY KEY (evento_id, categoria_id)
);

COMMENT ON TABLE evento_categoria IS
  'Associativa. Processo de negócio: classificar evento.';

CREATE TABLE lote (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id      UUID NOT NULL REFERENCES evento(id) ON DELETE CASCADE,
  nome           VARCHAR(60) NOT NULL,
  preco_centavos INTEGER     NOT NULL,
  vagas          INTEGER     NOT NULL,
  vendidos       INTEGER     NOT NULL DEFAULT 0,
  inicia_em      TIMESTAMPTZ,
  encerra_em     TIMESTAMPTZ,
  ordem          SMALLINT    NOT NULL DEFAULT 0,

  CONSTRAINT ck_lote_preco    CHECK (preco_centavos >= 0),
  CONSTRAINT ck_lote_vagas    CHECK (vagas > 0),
  CONSTRAINT ck_lote_vendidos CHECK (vendidos >= 0),
  -- Invariante central da venda: nunca vender mais do que existe.
  CONSTRAINT ck_lote_estoque  CHECK (vendidos <= vagas),
  -- Janela de venda coerente: um lote que encerra antes de abrir nunca vende.
  CONSTRAINT ck_lote_janela   CHECK (inicia_em IS NULL OR encerra_em IS NULL OR encerra_em > inicia_em),
  CONSTRAINT uk_lote_nome     UNIQUE (evento_id, nome)
);

COMMENT ON COLUMN lote.inicia_em IS
  'Abertura da venda do lote. NULL = aberto desde a publicação do evento.';
COMMENT ON COLUMN lote.encerra_em IS
  'Fechamento da venda do lote. NULL = aberto até o evento começar.';

COMMENT ON COLUMN lote.vendidos IS
  'Contador materializado. É a linha travada (SELECT ... FOR UPDATE) na transação de venda.';

-- -----------------------------------------------------------------------------
-- 3. Vendas
-- -----------------------------------------------------------------------------

CREATE TABLE cupom (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        VARCHAR(24) NOT NULL UNIQUE,
  tipo_desconto VARCHAR(12) NOT NULL,
  valor         INTEGER     NOT NULL,
  valido_de     TIMESTAMPTZ NOT NULL,
  valido_ate    TIMESTAMPTZ NOT NULL,
  limite_uso    INTEGER     NOT NULL,
  usos          INTEGER     NOT NULL DEFAULT 0,
  ativo         BOOLEAN     NOT NULL DEFAULT true,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ck_cupom_tipo    CHECK (tipo_desconto IN ('percentual', 'fixo')),
  CONSTRAINT ck_cupom_valor   CHECK (valor > 0),
  CONSTRAINT ck_cupom_janela  CHECK (valido_ate > valido_de),
  CONSTRAINT ck_cupom_limite  CHECK (limite_uso > 0),
  CONSTRAINT ck_cupom_usos    CHECK (usos >= 0 AND usos <= limite_uso),
  CONSTRAINT ck_cupom_percentual CHECK (tipo_desconto <> 'percentual' OR valor <= 100)
);

CREATE TABLE pedido (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comprador_id  UUID NOT NULL REFERENCES usuario(id),
  status        VARCHAR(12) NOT NULL DEFAULT 'aberto',
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  reservado_ate TIMESTAMPTZ,
  confirmado_em TIMESTAMPTZ,

  -- Dados de cobrança: um conjunto por pedido, preenchido na etapa 1 do
  -- checkout. Colunas do próprio pedido, não tabela à parte — é 1:1 e nunca
  -- é lido sem o pedido.
  cobranca_cpf         VARCHAR(11),
  cobranca_cep         VARCHAR(8),
  cobranca_logradouro  VARCHAR(160),
  cobranca_numero      VARCHAR(20),
  cobranca_complemento VARCHAR(80),
  cobranca_bairro      VARCHAR(80),
  cobranca_cidade      VARCHAR(80),
  cobranca_uf          CHAR(2),

  -- Estado transitório do checkout — vive só enquanto o pedido está aberto.
  -- `cupom_id` é o cupom aplicado nesta compra (a auditoria de uso de
  -- verdade é `uso_de_cupom`, gravada só na confirmação). Nenhum dos dois
  -- tem lugar numa tabela definitiva porque descrevem uma compra ainda não
  -- fechada, não um fato — ver docs/modelo-mudancas.md.
  cupom_id              UUID REFERENCES cupom(id),
  participantes_rascunho JSONB,

  CONSTRAINT ck_pedido_status CHECK (status IN ('aberto', 'confirmado', 'cancelado')),
  -- Pedido confirmado pode ser gratuito (sem cobrança) ou pago (cobrança completa).
  CONSTRAINT ck_pedido_cobranca CHECK (
    status <> 'confirmado'
    OR ((cobranca_cpf IS NULL AND cobranca_cep IS NULL
         AND cobranca_logradouro IS NULL AND cobranca_cidade IS NULL
         AND cobranca_uf IS NULL)
        OR (cobranca_cpf IS NOT NULL AND cobranca_cep IS NOT NULL
            AND cobranca_logradouro IS NOT NULL AND cobranca_cidade IS NOT NULL
            AND cobranca_uf IS NOT NULL))
  )
);

COMMENT ON TABLE pedido IS
  'Carrinho e compra são a mesma entidade: status=aberto é carrinho, confirmado é compra.';

CREATE TABLE item_pedido (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id               UUID NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  lote_id                 UUID NOT NULL REFERENCES lote(id),
  quantidade              INTEGER NOT NULL,
  preco_unitario_centavos INTEGER NOT NULL,

  CONSTRAINT ck_item_quantidade CHECK (quantidade > 0),
  CONSTRAINT ck_item_preco      CHECK (preco_unitario_centavos >= 0),
  CONSTRAINT uk_item_pedido_lote UNIQUE (pedido_id, lote_id)
);

COMMENT ON TABLE item_pedido IS
  'Associativa pedido × lote. Processo de negócio: adicionar ao carrinho.';
COMMENT ON COLUMN item_pedido.preco_unitario_centavos IS
  'Preço congelado na compra. Não é redundância: reajuste posterior do lote não altera pedido antigo.';

CREATE TABLE pagamento (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id      UUID NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  metodo         VARCHAR(10) NOT NULL,
  status         VARCHAR(12) NOT NULL DEFAULT 'pendente',
  valor_centavos INTEGER     NOT NULL,
  codigo_externo VARCHAR(200),
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  pago_em        TIMESTAMPTZ,

  CONSTRAINT ck_pagamento_metodo CHECK (metodo IN ('cartao', 'pix', 'boleto')),
  CONSTRAINT ck_pagamento_status CHECK (status IN ('pendente', 'aprovado', 'recusado', 'estornado')),
  CONSTRAINT ck_pagamento_valor  CHECK (valor_centavos >= 0)
);

CREATE TABLE cupom_evento (
  cupom_id  UUID NOT NULL REFERENCES cupom(id)  ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES evento(id) ON DELETE CASCADE,
  PRIMARY KEY (cupom_id, evento_id)
);

COMMENT ON TABLE cupom_evento IS
  'Associativa. Processo: restringir campanha. Ausência de linhas = cupom vale em todos os eventos.';

CREATE TABLE uso_de_cupom (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cupom_id          UUID NOT NULL REFERENCES cupom(id),
  pedido_id         UUID NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  evento_id         UUID NOT NULL REFERENCES evento(id),
  desconto_centavos INTEGER NOT NULL,
  usado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ck_uso_desconto CHECK (desconto_centavos >= 0),
  CONSTRAINT uk_uso_cupom UNIQUE (cupom_id, pedido_id, evento_id)
);

COMMENT ON TABLE uso_de_cupom IS
  'Associativa cupom × pedido × evento. Processo: aplicar cupom, com desconto rateado por evento.';

-- -----------------------------------------------------------------------------
-- 4. Participação
-- -----------------------------------------------------------------------------

CREATE TABLE inscricao (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id           UUID NOT NULL REFERENCES evento(id),
  participante_id     UUID NOT NULL REFERENCES participante(id),
  item_pedido_id      UUID NOT NULL REFERENCES item_pedido(id) ON DELETE CASCADE,
  lote_id             UUID NOT NULL REFERENCES lote(id),
  preco_pago_centavos INTEGER NOT NULL,
  status              VARCHAR(12) NOT NULL DEFAULT 'ativa',
  como_conheceu       VARCHAR(120),
  inscrito_em         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ck_inscricao_status CHECK (status IN ('ativa', 'cancelada')),
  CONSTRAINT ck_inscricao_preco  CHECK (preco_pago_centavos >= 0),
  CONSTRAINT uk_inscricao UNIQUE (evento_id, participante_id, item_pedido_id)
);

COMMENT ON TABLE inscricao IS
  'Associativa participante × evento. Processo: emitir ingresso. Núcleo dos relatórios.';

CREATE TABLE ingresso (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID NOT NULL UNIQUE REFERENCES inscricao(id) ON DELETE CASCADE,
  codigo       VARCHAR(64) NOT NULL UNIQUE,
  status       VARCHAR(12) NOT NULL DEFAULT 'emitido',
  emitido_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_ingresso_status CHECK (status IN ('emitido', 'utilizado', 'cancelado'))
);

COMMENT ON COLUMN ingresso.codigo IS 'Conteúdo do QR apresentado na entrada.';

CREATE TABLE check_in (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingresso_id   UUID NOT NULL UNIQUE REFERENCES ingresso(id) ON DELETE CASCADE,
  operador_id   UUID REFERENCES usuario(id) ON DELETE SET NULL,
  realizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE check_in IS
  'Associativa ingresso × operador. Processo: realizar check-in. UNIQUE garante uma entrada por ingresso.';

CREATE TABLE cancelamento_de_inscricao (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id  UUID NOT NULL REFERENCES inscricao(id) ON DELETE CASCADE,
  motivo        VARCHAR(200),
  status        VARCHAR(12) NOT NULL DEFAULT 'solicitado',
  solicitado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolvido_em  TIMESTAMPTZ,
  CONSTRAINT ck_cancelamento_status CHECK (status IN ('solicitado', 'aprovado', 'negado'))
);

-- -----------------------------------------------------------------------------
-- 5. Índices
-- -----------------------------------------------------------------------------

CREATE INDEX idx_evento_status_comeca   ON evento (status, comeca_em);
CREATE INDEX idx_evento_organizador     ON evento (organizador_id);
CREATE INDEX idx_lote_evento            ON lote (evento_id);
CREATE INDEX idx_pedido_comprador       ON pedido (comprador_id, status);
CREATE INDEX idx_item_pedido_pedido     ON item_pedido (pedido_id);
CREATE INDEX idx_item_pedido_lote       ON item_pedido (lote_id);
CREATE INDEX idx_pagamento_pedido       ON pagamento (pedido_id);
CREATE INDEX idx_inscricao_evento       ON inscricao (evento_id, status);
CREATE INDEX idx_inscricao_participante ON inscricao (participante_id);
CREATE INDEX idx_inscricao_lote         ON inscricao (lote_id);
CREATE INDEX idx_ingresso_codigo        ON ingresso (codigo);
CREATE INDEX idx_check_in_ingresso      ON check_in (ingresso_id);
CREATE INDEX idx_uso_cupom_cupom        ON uso_de_cupom (cupom_id);
CREATE INDEX idx_uso_cupom_evento       ON uso_de_cupom (evento_id);
CREATE INDEX idx_evento_categoria_cat   ON evento_categoria (categoria_id);

COMMIT;
