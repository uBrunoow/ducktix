import { and, desc, eq, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import {
  checkIn as checkInTabela,
  ingresso as ingressoTabela,
  inscricao as inscricaoTabela,
  itemPedido as itemPedidoTabela,
  lote as loteTabela,
  participante as participanteTabela,
  pedido as pedidoTabela,
} from '@/server/db/schema';
import { normalizarCodigo } from '../domain/check-in';
import type { Inscricao } from '../domain/inscricao';
import type {
  FiltroDeInscricoes,
  InscricoesRepository,
  PaginaDeInscricoes,
} from '../ports/inscricoes';

const SELECAO = {
  id: inscricaoTabela.id,
  eventoId: inscricaoTabela.eventoId,
  pedidoId: pedidoTabela.id,
  loteId: inscricaoTabela.loteId,
  loteNome: loteTabela.nome,
  precoPagoCentavos: inscricaoTabela.precoPagoCentavos,
  participanteNome: participanteTabela.nome,
  participanteSobrenome: participanteTabela.sobrenome,
  participanteEmail: participanteTabela.email,
  codigo: ingressoTabela.codigo,
  confirmadoEm: pedidoTabela.confirmadoEm,
  pedidoCriadoEm: pedidoTabela.criadoEm,
  status: inscricaoTabela.status,
  checkInEm: checkInTabela.realizadoEm,
} as const;

function paraInscricao(linha: Record<keyof typeof SELECAO, unknown>): Inscricao {
  const l = linha as {
    id: string;
    eventoId: string;
    pedidoId: string;
    loteId: string;
    loteNome: string;
    precoPagoCentavos: number;
    participanteNome: string;
    participanteSobrenome: string;
    participanteEmail: string;
    codigo: string;
    confirmadoEm: Date | null;
    pedidoCriadoEm: Date;
    status: string;
    checkInEm: Date | null;
  };
  return {
    id: l.id,
    eventoId: l.eventoId,
    pedidoId: l.pedidoId,
    loteId: l.loteId,
    loteNome: l.loteNome,
    precoPagoCentavos: l.precoPagoCentavos,
    participanteNome: l.participanteNome,
    participanteSobrenome: l.participanteSobrenome,
    participanteEmail: l.participanteEmail,
    codigo: l.codigo,
    compradoEm: l.confirmadoEm ?? l.pedidoCriadoEm,
    cancelada: l.status === 'cancelada',
    checkInEm: l.checkInEm,
  };
}

function baseSelectDeInscricoes() {
  return db
    .select(SELECAO)
    .from(inscricaoTabela)
    .innerJoin(itemPedidoTabela, eq(itemPedidoTabela.id, inscricaoTabela.itemPedidoId))
    .innerJoin(pedidoTabela, eq(pedidoTabela.id, itemPedidoTabela.pedidoId))
    .innerJoin(loteTabela, eq(loteTabela.id, inscricaoTabela.loteId))
    .innerJoin(participanteTabela, eq(participanteTabela.id, inscricaoTabela.participanteId))
    .innerJoin(ingressoTabela, eq(ingressoTabela.inscricaoId, inscricaoTabela.id))
    .leftJoin(checkInTabela, eq(checkInTabela.ingressoId, ingressoTabela.id));
}

class DrizzleInscricoesRepository implements InscricoesRepository {
  async listarPorEvento(
    eventoId: string,
    filtro: FiltroDeInscricoes = {},
  ): Promise<PaginaDeInscricoes> {
    const {
      busca = '',
      apenasPresentes = false,
      apenasAusentes = false,
      incluirCanceladas = true,
      pagina = 1,
      porPagina = 25,
    } = filtro;

    const condicoes = [eq(inscricaoTabela.eventoId, eventoId)];
    if (!incluirCanceladas) condicoes.push(ne(inscricaoTabela.status, 'cancelada'));
    if (apenasPresentes) condicoes.push(isNotNull(checkInTabela.realizadoEm));
    if (apenasAusentes) {
      condicoes.push(isNull(checkInTabela.realizadoEm));
      condicoes.push(ne(inscricaoTabela.status, 'cancelada'));
    }
    const termo = normalizarCodigo(busca);
    if (termo) {
      condicoes.push(
        sql`(${participanteTabela.nome} || ' ' || ${participanteTabela.sobrenome} || ' ' || ${participanteTabela.email} || ' ' || ${ingressoTabela.codigo}) ILIKE ${'%' + termo + '%'}`,
      );
    }
    const onde = and(...condicoes);

    const [itens, [{ total }]] = await Promise.all([
      baseSelectDeInscricoes()
        .where(onde)
        .orderBy(desc(pedidoTabela.criadoEm))
        .limit(porPagina)
        .offset(Math.max(0, (pagina - 1) * porPagina)),
      db.select({ total: sql<number>`count(*)::int` }).from(inscricaoTabela)
        .innerJoin(itemPedidoTabela, eq(itemPedidoTabela.id, inscricaoTabela.itemPedidoId))
        .innerJoin(pedidoTabela, eq(pedidoTabela.id, itemPedidoTabela.pedidoId))
        .innerJoin(participanteTabela, eq(participanteTabela.id, inscricaoTabela.participanteId))
        .innerJoin(ingressoTabela, eq(ingressoTabela.inscricaoId, inscricaoTabela.id))
        .leftJoin(checkInTabela, eq(checkInTabela.ingressoId, ingressoTabela.id))
        .where(onde),
    ]);

    return { itens: itens.map(paraInscricao), total };
  }

  async todasDoEvento(eventoId: string): Promise<readonly Inscricao[]> {
    const linhas = await baseSelectDeInscricoes().where(eq(inscricaoTabela.eventoId, eventoId));
    return linhas.map(paraInscricao);
  }

  async buscarPorCodigo(codigo: string): Promise<Inscricao | null> {
    const alvo = normalizarCodigo(codigo);
    if (!alvo) return null;
    const [linha] = await baseSelectDeInscricoes().where(eq(ingressoTabela.codigo, alvo)).limit(1);
    return linha ? paraInscricao(linha) : null;
  }

  /** `ON CONFLICT DO NOTHING` no `UNIQUE (ingresso_id)` de `check_in` decide
   *  a corrida entre duas leitoras — quem chegou primeiro grava, a segunda
   *  não sobrescreve, e as duas leem de volta a mesma linha vencedora. */
  async registrarCheckIn(inscricaoId: string, momento: Date): Promise<Inscricao | null> {
    // `momento.toISOString()`, não o Date cru: o `execute` de template bruto
    // não passa pela codificação de coluna do query builder, que é quem
    // normalmente serializa Date -> timestamp para o driver.
    await db.execute(sql`
      INSERT INTO check_in (ingresso_id, realizado_em)
      SELECT ${ingressoTabela.id}, ${momento.toISOString()}
      FROM ${ingressoTabela}
      WHERE ${ingressoTabela.inscricaoId} = ${inscricaoId}
      ON CONFLICT (ingresso_id) DO NOTHING
    `);
    return this.buscarPorId(inscricaoId);
  }

  async desfazerCheckIn(inscricaoId: string): Promise<Inscricao | null> {
    await db.execute(sql`
      DELETE FROM check_in
      WHERE ingresso_id IN (
        SELECT id FROM ingresso WHERE inscricao_id = ${inscricaoId}
      )
    `);
    return this.buscarPorId(inscricaoId);
  }

  async ultimosCheckIns(eventoId: string, limite: number): Promise<readonly Inscricao[]> {
    const linhas = await baseSelectDeInscricoes()
      .where(and(eq(inscricaoTabela.eventoId, eventoId), isNotNull(checkInTabela.realizadoEm)))
      .orderBy(desc(checkInTabela.realizadoEm))
      .limit(limite);
    return linhas.map(paraInscricao);
  }

  private async buscarPorId(inscricaoId: string): Promise<Inscricao | null> {
    const [linha] = await baseSelectDeInscricoes().where(eq(inscricaoTabela.id, inscricaoId)).limit(1);
    return linha ? paraInscricao(linha) : null;
  }
}

export const drizzleInscricoesRepository: InscricoesRepository = new DrizzleInscricoesRepository();
