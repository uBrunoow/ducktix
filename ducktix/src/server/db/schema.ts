/**
 * Fonte da verdade do esquema (gera as migrations em `drizzle/` — ver
 * README 2.6). `db/schema.sql` é um espelho SQL mantido para o dicionário de
 * dados do documento de entrega e para o bootstrap do Postgres local via
 * Docker; se os dois divergirem, corrija aqui e rode `npm run db:generate`.
 */

import {
  boolean,
  char,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/** Espelha `RascunhoDeParticipante` de `ticketing/domain/pedido.ts` — não
 *  importado de lá para este arquivo não depender do domínio. */
interface RascunhoDeParticipanteJson {
  nome: string;
  sobrenome: string;
  cpf: string;
  email: string;
  celular: string;
  nomeCracha: string;
  comoConheceu: string;
  linkedin: string;
  github: string;
  empresa: string;
  segmento: string;
  cargo: string;
  nivel: string;
}

// -----------------------------------------------------------------------------
// 1. Identidade
// -----------------------------------------------------------------------------

export const usuario = pgTable(
  'usuario',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: varchar('nome', { length: 120 }).notNull(),
    email: varchar('email', { length: 160 }).notNull().unique(),
    senhaHash: varchar('senha_hash', { length: 255 }).notNull(),
    papel: varchar('papel', { length: 20 }).notNull(),
    cpfCnpj: varchar('cpf_cnpj', { length: 14 }),
    fotoUrl: text('foto_url'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('ck_usuario_papel', sql`${t.papel} IN ('participante', 'organizador')`),
    check('ck_usuario_documento', sql`${t.cpfCnpj} IS NULL OR length(${t.cpfCnpj}) IN (11, 14)`),
  ],
);

export const organizador = pgTable('organizador', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Nulo para organizadores resolvidos só pelo nome de exibição do evento —
  // ver comentário da coluna em db/schema.sql e docs/modelo-mudancas.md.
  usuarioId: uuid('usuario_id')
    .unique()
    .references(() => usuario.id, { onDelete: 'cascade' }),
  nomeFantasia: varchar('nome_fantasia', { length: 140 }).notNull(),
  documento: varchar('documento', { length: 14 }),
  emailContato: varchar('email_contato', { length: 160 }),
});

export const participante = pgTable('participante', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: uuid('usuario_id').references(() => usuario.id, { onDelete: 'set null' }),
  nome: varchar('nome', { length: 80 }).notNull(),
  sobrenome: varchar('sobrenome', { length: 80 }).notNull(),
  email: varchar('email', { length: 160 }).notNull(),
  cpf: varchar('cpf', { length: 11 }),
  celular: varchar('celular', { length: 20 }),
  nomeCracha: varchar('nome_cracha', { length: 80 }),
  linkedin: varchar('linkedin', { length: 200 }),
  github: varchar('github', { length: 200 }),
  empresa: varchar('empresa', { length: 140 }),
  segmento: varchar('segmento', { length: 80 }),
  cargo: varchar('cargo', { length: 80 }),
  nivel: varchar('nivel', { length: 40 }),
});

export const tokenRedefinicaoSenha = pgTable('token_redefinicao_senha', {
  token: varchar('token', { length: 120 }).primaryKey(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuario.id, { onDelete: 'cascade' }),
  expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
});

// -----------------------------------------------------------------------------
// 2. Eventos
// -----------------------------------------------------------------------------

export const categoria = pgTable('categoria', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: varchar('nome', { length: 60 }).notNull().unique(),
  slug: varchar('slug', { length: 60 }).notNull().unique(),
});

export const evento = pgTable(
  'evento',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizadorId: uuid('organizador_id')
      .notNull()
      .references(() => organizador.id),
    slug: varchar('slug', { length: 160 }).notNull().unique(),
    nome: varchar('nome', { length: 140 }).notNull(),
    descricao: text('descricao').notNull(),
    local: varchar('local', { length: 160 }),
    modalidade: varchar('modalidade', { length: 12 }).notNull(),
    formatoOnline: varchar('formato_online', { length: 20 }),
    status: varchar('status', { length: 12 }).notNull().default('rascunho'),
    visibilidade: varchar('visibilidade', { length: 12 }).notNull().default('publico'),
    comecaEm: timestamp('comeca_em', { withTimezone: true }).notNull(),
    terminaEm: timestamp('termina_em', { withTimezone: true }).notNull(),
    imagemUrl: text('imagem_url'),
    isHighlighted: boolean('is_highlighted').notNull().default(false),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_evento_status_comeca').on(t.status, t.comecaEm),
    index('idx_evento_highlighted').on(t.isHighlighted, t.status, t.visibilidade, t.comecaEm),
    index('idx_evento_organizador').on(t.organizadorId),
    check('ck_evento_modalidade', sql`${t.modalidade} IN ('presencial', 'online', 'hibrido')`),
    check(
      'ck_evento_formato',
      sql`${t.formatoOnline} IS NULL OR ${t.formatoOnline} IN ('ao-vivo', 'videoconferencia', 'desafio-virtual', 'conteudo-digital')`,
    ),
    check('ck_evento_status', sql`${t.status} IN ('rascunho', 'publicado', 'encerrado', 'cancelado')`),
    check('ck_evento_visibilidade', sql`${t.visibilidade} IN ('publico', 'nao-listado')`),
    check('ck_evento_periodo', sql`${t.terminaEm} > ${t.comecaEm}`),
    check(
      'ck_evento_local_por_modalidade',
      sql`(${t.modalidade} = 'online' AND ${t.local} IS NULL) OR (${t.modalidade} <> 'online' AND ${t.local} IS NOT NULL)`,
    ),
    check(
      'ck_evento_formato_por_modalidade',
      sql`(${t.modalidade} = 'presencial' AND ${t.formatoOnline} IS NULL) OR (${t.modalidade} <> 'presencial' AND ${t.formatoOnline} IS NOT NULL)`,
    ),
  ],
);

export const eventoCategoria = pgTable(
  'evento_categoria',
  {
    eventoId: uuid('evento_id')
      .notNull()
      .references(() => evento.id, { onDelete: 'cascade' }),
    categoriaId: uuid('categoria_id')
      .notNull()
      .references(() => categoria.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.eventoId, t.categoriaId] }),
    index('idx_evento_categoria_cat').on(t.categoriaId),
  ],
);

export const lote = pgTable(
  'lote',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventoId: uuid('evento_id')
      .notNull()
      .references(() => evento.id, { onDelete: 'cascade' }),
    nome: varchar('nome', { length: 60 }).notNull(),
    precoCentavos: integer('preco_centavos').notNull(),
    vagas: integer('vagas').notNull(),
    vendidos: integer('vendidos').notNull().default(0),
    iniciaEm: timestamp('inicia_em', { withTimezone: true }),
    encerraEm: timestamp('encerra_em', { withTimezone: true }),
    ordem: smallint('ordem').notNull().default(0),
  },
  (t) => [
    index('idx_lote_evento').on(t.eventoId),
    unique('uk_lote_nome').on(t.eventoId, t.nome),
    check('ck_lote_preco', sql`${t.precoCentavos} >= 0`),
    check('ck_lote_vagas', sql`${t.vagas} > 0`),
    check('ck_lote_vendidos', sql`${t.vendidos} >= 0`),
    check('ck_lote_estoque', sql`${t.vendidos} <= ${t.vagas}`),
    check(
      'ck_lote_janela',
      sql`${t.iniciaEm} IS NULL OR ${t.encerraEm} IS NULL OR ${t.encerraEm} > ${t.iniciaEm}`,
    ),
  ],
);

// -----------------------------------------------------------------------------
// 3. Vendas
// -----------------------------------------------------------------------------

export const cupom = pgTable(
  'cupom',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codigo: varchar('codigo', { length: 24 }).notNull(),
    tipoDesconto: varchar('tipo_desconto', { length: 12 }).notNull(),
    valor: integer('valor').notNull(),
    validoDe: timestamp('valido_de', { withTimezone: true }).notNull(),
    validoAte: timestamp('valido_ate', { withTimezone: true }).notNull(),
    limiteUso: integer('limite_uso').notNull(),
    usos: integer('usos').notNull().default(0),
    ativo: boolean('ativo').notNull().default(true),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('ck_cupom_tipo', sql`${t.tipoDesconto} IN ('percentual', 'fixo')`),
    check('ck_cupom_valor', sql`${t.valor} > 0`),
    check('ck_cupom_janela', sql`${t.validoAte} > ${t.validoDe}`),
    check('ck_cupom_limite', sql`${t.limiteUso} > 0`),
    check('ck_cupom_usos', sql`${t.usos} >= 0 AND ${t.usos} <= ${t.limiteUso}`),
    check('ck_cupom_percentual', sql`${t.tipoDesconto} <> 'percentual' OR ${t.valor} <= 100`),
  ],
);

export const pedido = pgTable(
  'pedido',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    compradorId: uuid('comprador_id')
      .notNull()
      .references(() => usuario.id),
    status: varchar('status', { length: 12 }).notNull().default('aberto'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    reservadoAte: timestamp('reservado_ate', { withTimezone: true }),
    confirmadoEm: timestamp('confirmado_em', { withTimezone: true }),

    cobrancaCpf: varchar('cobranca_cpf', { length: 11 }),
    cobrancaCep: varchar('cobranca_cep', { length: 8 }),
    cobrancaLogradouro: varchar('cobranca_logradouro', { length: 160 }),
    cobrancaNumero: varchar('cobranca_numero', { length: 20 }),
    cobrancaComplemento: varchar('cobranca_complemento', { length: 80 }),
    cobrancaBairro: varchar('cobranca_bairro', { length: 80 }),
    cobrancaCidade: varchar('cobranca_cidade', { length: 80 }),
    cobrancaUf: char('cobranca_uf', { length: 2 }),

    // Estado transitório do checkout — ver comentário da coluna em
    // db/schema.sql e docs/modelo-mudancas.md.
    cupomId: uuid('cupom_id').references(() => cupom.id),
    participantesRascunho: jsonb('participantes_rascunho').$type<RascunhoDeParticipanteJson[]>(),
  },
  (t) => [
    index('idx_pedido_comprador').on(t.compradorId, t.status),
    check('ck_pedido_status', sql`${t.status} IN ('aberto', 'confirmado', 'cancelado')`),
    check(
      'ck_pedido_cobranca',
      sql`${t.status} <> 'confirmado' OR (
        (${t.cobrancaCpf} IS NULL AND ${t.cobrancaCep} IS NULL AND ${t.cobrancaLogradouro} IS NULL AND ${t.cobrancaCidade} IS NULL AND ${t.cobrancaUf} IS NULL)
        OR
        (${t.cobrancaCpf} IS NOT NULL AND ${t.cobrancaCep} IS NOT NULL AND ${t.cobrancaLogradouro} IS NOT NULL AND ${t.cobrancaCidade} IS NOT NULL AND ${t.cobrancaUf} IS NOT NULL)
      )`,
    ),
  ],
);

export const itemPedido = pgTable(
  'item_pedido',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pedidoId: uuid('pedido_id')
      .notNull()
      .references(() => pedido.id, { onDelete: 'cascade' }),
    loteId: uuid('lote_id')
      .notNull()
      .references(() => lote.id),
    quantidade: integer('quantidade').notNull(),
    precoUnitarioCentavos: integer('preco_unitario_centavos').notNull(),
  },
  (t) => [
    index('idx_item_pedido_pedido').on(t.pedidoId),
    index('idx_item_pedido_lote').on(t.loteId),
    unique('uk_item_pedido_lote').on(t.pedidoId, t.loteId),
    check('ck_item_quantidade', sql`${t.quantidade} > 0`),
    check('ck_item_preco', sql`${t.precoUnitarioCentavos} >= 0`),
  ],
);

export const pagamento = pgTable(
  'pagamento',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pedidoId: uuid('pedido_id')
      .notNull()
      .references(() => pedido.id, { onDelete: 'cascade' }),
    metodo: varchar('metodo', { length: 10 }).notNull(),
    status: varchar('status', { length: 12 }).notNull().default('pendente'),
    valorCentavos: integer('valor_centavos').notNull(),
    codigoExterno: varchar('codigo_externo', { length: 200 }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    pagoEm: timestamp('pago_em', { withTimezone: true }),
  },
  (t) => [
    index('idx_pagamento_pedido').on(t.pedidoId),
    check('ck_pagamento_metodo', sql`${t.metodo} IN ('cartao', 'pix', 'boleto')`),
    check('ck_pagamento_status', sql`${t.status} IN ('pendente', 'aprovado', 'recusado', 'estornado')`),
    check('ck_pagamento_valor', sql`${t.valorCentavos} >= 0`),
  ],
);

export const cupomEvento = pgTable(
  'cupom_evento',
  {
    cupomId: uuid('cupom_id')
      .notNull()
      .references(() => cupom.id, { onDelete: 'cascade' }),
    eventoId: uuid('evento_id')
      .notNull()
      .references(() => evento.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.cupomId, t.eventoId] })],
);

export const usoDeCupom = pgTable(
  'uso_de_cupom',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cupomId: uuid('cupom_id')
      .notNull()
      .references(() => cupom.id),
    pedidoId: uuid('pedido_id')
      .notNull()
      .references(() => pedido.id, { onDelete: 'cascade' }),
    eventoId: uuid('evento_id')
      .notNull()
      .references(() => evento.id),
    descontoCentavos: integer('desconto_centavos').notNull(),
    usadoEm: timestamp('usado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_uso_cupom_cupom').on(t.cupomId),
    index('idx_uso_cupom_evento').on(t.eventoId),
    unique('uk_uso_cupom').on(t.cupomId, t.pedidoId, t.eventoId),
    check('ck_uso_desconto', sql`${t.descontoCentavos} >= 0`),
  ],
);

// -----------------------------------------------------------------------------
// 4. Participação
// -----------------------------------------------------------------------------

export const inscricao = pgTable(
  'inscricao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventoId: uuid('evento_id')
      .notNull()
      .references(() => evento.id),
    participanteId: uuid('participante_id')
      .notNull()
      .references(() => participante.id),
    itemPedidoId: uuid('item_pedido_id')
      .notNull()
      .references(() => itemPedido.id, { onDelete: 'cascade' }),
    loteId: uuid('lote_id')
      .notNull()
      .references(() => lote.id),
    precoPagoCentavos: integer('preco_pago_centavos').notNull(),
    status: varchar('status', { length: 12 }).notNull().default('ativa'),
    comoConheceu: varchar('como_conheceu', { length: 120 }),
    inscritoEm: timestamp('inscrito_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_inscricao_evento').on(t.eventoId, t.status),
    index('idx_inscricao_participante').on(t.participanteId),
    index('idx_inscricao_lote').on(t.loteId),
    unique('uk_inscricao').on(t.eventoId, t.participanteId, t.itemPedidoId),
    check('ck_inscricao_status', sql`${t.status} IN ('ativa', 'cancelada')`),
    check('ck_inscricao_preco', sql`${t.precoPagoCentavos} >= 0`),
  ],
);

export const ingresso = pgTable(
  'ingresso',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inscricaoId: uuid('inscricao_id')
      .notNull()
      .unique()
      .references(() => inscricao.id, { onDelete: 'cascade' }),
    codigo: varchar('codigo', { length: 64 }).notNull().unique(),
    status: varchar('status', { length: 12 }).notNull().default('emitido'),
    emitidoEm: timestamp('emitido_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_ingresso_codigo').on(t.codigo),
    check('ck_ingresso_status', sql`${t.status} IN ('emitido', 'utilizado', 'cancelado')`),
  ],
);

export const checkIn = pgTable(
  'check_in',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ingressoId: uuid('ingresso_id')
      .notNull()
      .unique()
      .references(() => ingresso.id, { onDelete: 'cascade' }),
    operadorId: uuid('operador_id').references(() => usuario.id, { onDelete: 'set null' }),
    realizadoEm: timestamp('realizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_check_in_ingresso').on(t.ingressoId)],
);

export const cancelamentoDeInscricao = pgTable(
  'cancelamento_de_inscricao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inscricaoId: uuid('inscricao_id')
      .notNull()
      .references(() => inscricao.id, { onDelete: 'cascade' }),
    motivo: varchar('motivo', { length: 200 }),
    status: varchar('status', { length: 12 }).notNull().default('solicitado'),
    solicitadoEm: timestamp('solicitado_em', { withTimezone: true }).notNull().defaultNow(),
    resolvidoEm: timestamp('resolvido_em', { withTimezone: true }),
  },
  (t) => [check('ck_cancelamento_status', sql`${t.status} IN ('solicitado', 'aprovado', 'negado')`)],
);
