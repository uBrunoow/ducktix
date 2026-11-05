import { randomUUID } from 'node:crypto';
import { colecoes, type CancelamentoDoc, type InscricaoDoc } from '@/server/db/colecoes';
import type { CancelamentoDeInscricao, StatusDeCancelamento } from '../domain/cancelamento';
import type { CancelamentosRepository } from '../ports/cancelamentos';

/** Solicitações de cancelamento ficam no array `cancelamentos` da própria
 *  inscrição — nome, e-mail e pedido já estão no mesmo documento, sem o JOIN
 *  de cinco tabelas do repositório SQL. */
function paraCancelamento(inscricao: InscricaoDoc, c: CancelamentoDoc): CancelamentoDeInscricao {
  return {
    id: c._id,
    inscricaoId: inscricao._id,
    eventoId: inscricao.eventoId,
    pedidoId: inscricao.pedidoId,
    participanteNome: inscricao.participante.nome,
    participanteEmail: inscricao.participante.email,
    motivo: c.motivo,
    status: c.status as StatusDeCancelamento,
    solicitadoEm: c.solicitadoEm,
    resolvidoEm: c.resolvidoEm,
  };
}

/** A solicitação mais recente da inscrição (ORDER BY solicitado_em DESC LIMIT 1). */
function maisRecente(inscricao: InscricaoDoc | null): CancelamentoDeInscricao | null {
  if (!inscricao || inscricao.cancelamentos.length === 0) return null;
  const [ultimo] = [...inscricao.cancelamentos].sort(
    (a, b) => b.solicitadoEm.getTime() - a.solicitadoEm.getTime(),
  );
  return paraCancelamento(inscricao, ultimo);
}

class MongoCancelamentosRepository implements CancelamentosRepository {
  async buscarContextoDoIngresso(ingressoId: string) {
    const doc = await colecoes.inscricoes().findOne({ 'ingresso.id': ingressoId });
    if (!doc) return null;
    return {
      inscricaoId: doc._id,
      pedidoId: doc.pedidoId,
      compradorId: doc.compradorId,
      ingressoStatus: doc.ingresso.status,
      checkInEm: doc.checkIn?.realizadoEm ?? null,
    };
  }

  async buscarPorInscricao(inscricaoId: string): Promise<CancelamentoDeInscricao | null> {
    return maisRecente(await colecoes.inscricoes().findOne({ _id: inscricaoId }));
  }

  async buscarPorIngresso(ingressoId: string): Promise<CancelamentoDeInscricao | null> {
    return maisRecente(await colecoes.inscricoes().findOne({ 'ingresso.id': ingressoId }));
  }

  async solicitar(inscricaoId: string, motivo: string | null): Promise<CancelamentoDeInscricao> {
    const cancelamento: CancelamentoDoc = {
      _id: randomUUID(),
      motivo,
      status: 'solicitado',
      solicitadoEm: new Date(),
      resolvidoEm: null,
    };
    const doc = await colecoes
      .inscricoes()
      .findOneAndUpdate(
        { _id: inscricaoId },
        { $push: { cancelamentos: cancelamento } },
        { returnDocument: 'after' },
      );
    if (!doc) throw new Error('Solicitação de cancelamento não encontrada após criação.');
    return paraCancelamento(doc, cancelamento);
  }

  /** `$unwind` das solicitações embutidas, filtrando as pendentes do evento. */
  async listarSolicitadosDoEvento(eventoId: string): Promise<readonly CancelamentoDeInscricao[]> {
    const linhas = await colecoes
      .inscricoes()
      .aggregate<InscricaoDoc & { cancelamento: CancelamentoDoc }>([
        { $match: { eventoId, 'cancelamentos.status': 'solicitado' } },
        { $unwind: '$cancelamentos' },
        { $match: { 'cancelamentos.status': 'solicitado' } },
        { $addFields: { cancelamento: '$cancelamentos' } },
        { $sort: { 'cancelamento.solicitadoEm': -1 } },
      ])
      .toArray();
    return linhas.map((linha) => paraCancelamento(linha, linha.cancelamento));
  }

  /**
   * Decide a solicitação. Status do cancelamento, da inscrição e do ingresso
   * mudam num único `updateOne` (antes, três UPDATEs numa transação). O
   * filtro `status: 'solicitado'` impede decidir duas vezes a mesma
   * solicitação.
   */
  async resolver(
    cancelamentoId: string,
    eventoId: string,
    status: Extract<StatusDeCancelamento, 'aprovado' | 'negado'>,
  ): Promise<CancelamentoDeInscricao | null> {
    const filtroDoEvento = { eventoId, 'cancelamentos._id': cancelamentoId };
    if (!(await colecoes.inscricoes().countDocuments(filtroDoEvento, { limit: 1 }))) return null;

    await colecoes.inscricoes().updateOne(
      { eventoId, cancelamentos: { $elemMatch: { _id: cancelamentoId, status: 'solicitado' } } },
      {
        $set: {
          'cancelamentos.$.status': status,
          'cancelamentos.$.resolvidoEm': new Date(),
          ...(status === 'aprovado' ? { status: 'cancelada', 'ingresso.status': 'cancelado' } : {}),
        },
      },
    );

    const doc = await colecoes.inscricoes().findOne(filtroDoEvento);
    const cancelamento = doc?.cancelamentos.find((c) => c._id === cancelamentoId);
    return doc && cancelamento ? paraCancelamento(doc, cancelamento) : null;
  }
}

export const mongoCancelamentosRepository: CancelamentosRepository =
  new MongoCancelamentosRepository();
