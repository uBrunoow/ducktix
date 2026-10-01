import type { Filter } from 'mongodb';
import { colecoes, type InscricaoDoc } from '@/server/db/colecoes';
import { normalizarCodigo } from '../domain/check-in';
import type { Inscricao } from '../domain/inscricao';
import type {
  FiltroDeInscricoes,
  InscricoesRepository,
  PaginaDeInscricoes,
} from '../ports/inscricoes';

/**
 * Tudo o que a lista de inscritos mostra está num documento de
 * `inscricoes`. No Postgres a mesma linha saía de um JOIN de sete tabelas
 * (inscricao, item_pedido, pedido, lote, participante, ingresso, check_in).
 */
function paraInscricao(doc: InscricaoDoc): Inscricao {
  return {
    id: doc._id,
    eventoId: doc.eventoId,
    pedidoId: doc.pedidoId,
    loteId: doc.lote.id,
    loteNome: doc.lote.nome,
    precoPagoCentavos: doc.precoPagoCentavos,
    participanteNome: doc.participante.nome,
    participanteSobrenome: doc.participante.sobrenome,
    participanteEmail: doc.participante.email,
    codigo: doc.ingresso.codigo,
    compradoEm: doc.pedidoConfirmadoEm ?? doc.pedidoCriadoEm,
    cancelada: doc.status === 'cancelada',
    checkInEm: doc.checkIn?.realizadoEm ?? null,
  };
}

const escaparRegex = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class MongoInscricoesRepository implements InscricoesRepository {
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

    const condicoes: Filter<InscricaoDoc>[] = [{ eventoId }];
    if (!incluirCanceladas) condicoes.push({ status: { $ne: 'cancelada' } });
    if (apenasPresentes) condicoes.push({ checkIn: { $ne: null } });
    if (apenasAusentes) condicoes.push({ checkIn: null, status: { $ne: 'cancelada' } });
    const termo = normalizarCodigo(busca);
    if (termo) {
      // Mesmo critério do ILIKE sobre "nome sobrenome email código" do SQL.
      condicoes.push({
        $expr: {
          $regexMatch: {
            input: {
              $concat: [
                '$participante.nome', ' ', '$participante.sobrenome', ' ',
                '$participante.email', ' ', '$ingresso.codigo',
              ],
            },
            regex: escaparRegex(termo),
            options: 'i',
          },
        },
      });
    }
    const onde: Filter<InscricaoDoc> = { $and: condicoes };

    const [docs, total] = await Promise.all([
      colecoes
        .inscricoes()
        .find(onde)
        .sort({ pedidoCriadoEm: -1, _id: 1 })
        .skip(Math.max(0, (pagina - 1) * porPagina))
        .limit(porPagina)
        .toArray(),
      colecoes.inscricoes().countDocuments(onde),
    ]);

    return { itens: docs.map(paraInscricao), total };
  }

  async todasDoEvento(eventoId: string): Promise<readonly Inscricao[]> {
    const docs = await colecoes.inscricoes().find({ eventoId }).toArray();
    return docs.map(paraInscricao);
  }

  async buscarPorCodigo(codigo: string): Promise<Inscricao | null> {
    const alvo = normalizarCodigo(codigo);
    if (!alvo) return null;
    const doc = await colecoes.inscricoes().findOne({ 'ingresso.codigo': alvo });
    return doc ? paraInscricao(doc) : null;
  }

  /**
   * Substitui o `INSERT ... ON CONFLICT (ingresso_id) DO NOTHING`: o filtro
   * `checkIn: null` só casa enquanto ninguém registrou a entrada. Duas
   * leitoras ao mesmo tempo — a primeira grava, a segunda não sobrescreve, e
   * as duas leem de volta o mesmo horário vencedor.
   */
  async registrarCheckIn(inscricaoId: string, momento: Date): Promise<Inscricao | null> {
    await colecoes
      .inscricoes()
      .updateOne(
        { _id: inscricaoId, checkIn: null },
        { $set: { checkIn: { realizadoEm: momento, operadorId: null } } },
      );
    return this.buscarPorId(inscricaoId);
  }

  async desfazerCheckIn(inscricaoId: string): Promise<Inscricao | null> {
    await colecoes.inscricoes().updateOne({ _id: inscricaoId }, { $set: { checkIn: null } });
    return this.buscarPorId(inscricaoId);
  }

  async ultimosCheckIns(eventoId: string, limite: number): Promise<readonly Inscricao[]> {
    const docs = await colecoes
      .inscricoes()
      .find({ eventoId, checkIn: { $ne: null } })
      .sort({ 'checkIn.realizadoEm': -1 })
      .limit(limite)
      .toArray();
    return docs.map(paraInscricao);
  }

  private async buscarPorId(inscricaoId: string): Promise<Inscricao | null> {
    const doc = await colecoes.inscricoes().findOne({ _id: inscricaoId });
    return doc ? paraInscricao(doc) : null;
  }
}

export const mongoInscricoesRepository: InscricoesRepository = new MongoInscricoesRepository();
