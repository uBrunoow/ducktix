import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import {
  cancelamentoDeInscricao,
  inscricao,
  itemPedido,
  participante,
  pedido,
  ingresso,
  checkIn,
} from '@/server/db/schema';
import type { CancelamentoDeInscricao, StatusDeCancelamento } from '../domain/cancelamento';
import type { CancelamentosRepository } from '../ports/cancelamentos';

const selecao = {
  id: cancelamentoDeInscricao.id,
  inscricaoId: cancelamentoDeInscricao.inscricaoId,
  eventoId: inscricao.eventoId,
  pedidoId: pedido.id,
  participanteNome: participante.nome,
  participanteEmail: participante.email,
  motivo: cancelamentoDeInscricao.motivo,
  status: cancelamentoDeInscricao.status,
  solicitadoEm: cancelamentoDeInscricao.solicitadoEm,
  resolvidoEm: cancelamentoDeInscricao.resolvidoEm,
} as const;

function paraCancelamento(linha: Record<keyof typeof selecao, unknown>): CancelamentoDeInscricao {
  const l = linha as {
    id: string;
    inscricaoId: string;
    eventoId: string;
    pedidoId: string;
    participanteNome: string;
    participanteEmail: string;
    motivo: string | null;
    status: string;
    solicitadoEm: Date;
    resolvidoEm: Date | null;
  };
  return { ...l, status: l.status as StatusDeCancelamento };
}

function baseSelect() {
  return db
    .select(selecao)
    .from(cancelamentoDeInscricao)
    .innerJoin(inscricao, eq(inscricao.id, cancelamentoDeInscricao.inscricaoId))
    .innerJoin(participante, eq(participante.id, inscricao.participanteId))
    .innerJoin(ingresso, eq(ingresso.inscricaoId, inscricao.id))
    .innerJoin(itemPedido, eq(itemPedido.id, inscricao.itemPedidoId))
    .innerJoin(pedido, eq(pedido.id, itemPedido.pedidoId));
}

class DrizzleCancelamentosRepository implements CancelamentosRepository {
  async buscarContextoDoIngresso(ingressoId: string) {
    const [linha] = await db
      .select({
        inscricaoId: inscricao.id,
        pedidoId: pedido.id,
        compradorId: pedido.compradorId,
        ingressoStatus: ingresso.status,
        checkInEm: checkIn.realizadoEm,
      })
      .from(ingresso)
      .innerJoin(inscricao, eq(inscricao.id, ingresso.inscricaoId))
      .innerJoin(itemPedido, eq(itemPedido.id, inscricao.itemPedidoId))
      .innerJoin(pedido, eq(pedido.id, itemPedido.pedidoId))
      .leftJoin(checkIn, eq(checkIn.ingressoId, ingresso.id))
      .where(eq(ingresso.id, ingressoId))
      .limit(1);
    return linha ?? null;
  }

  async buscarPorInscricao(inscricaoId: string): Promise<CancelamentoDeInscricao | null> {
    const [linha] = await baseSelect()
      .where(eq(cancelamentoDeInscricao.inscricaoId, inscricaoId))
      .orderBy(desc(cancelamentoDeInscricao.solicitadoEm))
      .limit(1);
    return linha ? paraCancelamento(linha) : null;
  }

  async buscarPorIngresso(ingressoId: string): Promise<CancelamentoDeInscricao | null> {
    const [linha] = await baseSelect()
      .where(eq(ingresso.id, ingressoId))
      .orderBy(desc(cancelamentoDeInscricao.solicitadoEm))
      .limit(1);
    return linha ? paraCancelamento(linha) : null;
  }

  async solicitar(inscricaoId: string, motivo: string | null): Promise<CancelamentoDeInscricao> {
    const [linha] = await db
      .insert(cancelamentoDeInscricao)
      .values({ inscricaoId, motivo, status: 'solicitado' })
      .returning({ id: cancelamentoDeInscricao.id });
    const cancelamento = await this.buscarPorId(linha.id);
    if (!cancelamento) throw new Error('Solicitação de cancelamento não encontrada após criação.');
    return cancelamento;
  }

  async listarSolicitadosDoEvento(eventoId: string): Promise<readonly CancelamentoDeInscricao[]> {
    const linhas = await baseSelect()
      .where(and(eq(inscricao.eventoId, eventoId), eq(cancelamentoDeInscricao.status, 'solicitado')))
      .orderBy(desc(cancelamentoDeInscricao.solicitadoEm));
    return linhas.map(paraCancelamento);
  }

  async resolver(
    cancelamentoId: string,
    eventoId: string,
    status: Extract<StatusDeCancelamento, 'aprovado' | 'negado'>,
  ): Promise<CancelamentoDeInscricao | null> {
    const [linha] = await db
      .select({ inscricaoId: cancelamentoDeInscricao.inscricaoId })
      .from(cancelamentoDeInscricao)
      .innerJoin(inscricao, eq(inscricao.id, cancelamentoDeInscricao.inscricaoId))
      .where(and(eq(cancelamentoDeInscricao.id, cancelamentoId), eq(inscricao.eventoId, eventoId)))
      .limit(1);
    if (!linha) return null;

    await db.transaction(async (tx) => {
      const atualizado = await tx
        .update(cancelamentoDeInscricao)
        .set({ status, resolvidoEm: new Date() })
        .where(and(
          eq(cancelamentoDeInscricao.id, cancelamentoId),
          eq(cancelamentoDeInscricao.status, 'solicitado'),
        ))
        .returning({ id: cancelamentoDeInscricao.id });
      if (atualizado.length === 0) return;
      if (status === 'aprovado') {
        await tx
          .update(inscricao)
          .set({ status: 'cancelada' })
          .where(eq(inscricao.id, linha.inscricaoId));
        await tx
          .update(ingresso)
          .set({ status: 'cancelado' })
          .where(eq(ingresso.inscricaoId, linha.inscricaoId));
      }
    });
    return this.buscarPorId(cancelamentoId);
  }

  private async buscarPorId(id: string): Promise<CancelamentoDeInscricao | null> {
    const [linha] = await baseSelect().where(eq(cancelamentoDeInscricao.id, id)).limit(1);
    return linha ? paraCancelamento(linha) : null;
  }
}

export const drizzleCancelamentosRepository: CancelamentosRepository =
  new DrizzleCancelamentosRepository();
