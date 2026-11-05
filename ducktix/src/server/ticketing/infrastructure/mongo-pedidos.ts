import { randomUUID } from 'node:crypto';
import { colecoes, type PedidoDoc, type RascunhoDeParticipanteDoc } from '@/server/db/colecoes';
import { PedidoNaoEncontradoError } from '../domain/erros';
import type {
  DadosDeCobranca,
  ItemPedido,
  MetodoDePagamento,
  Pedido,
  RascunhoDeParticipante,
  StatusPedido,
} from '../domain/pedido';
import type { PedidosRepository } from '../ports/pedidos';

/**
 * Itens e pagamentos vêm embutidos no pedido, e cada item já guarda o
 * `eventoId` — no Postgres eram duas consultas extras e um JOIN com `lote`.
 */
function paraPedido(doc: PedidoDoc): Pedido {
  // Método = o do pagamento mais recente (mesma regra do SQL: ORDER BY
  // criado_em DESC, primeiro por pedido).
  const ultimoPagamento = [...doc.pagamentos].sort(
    (a, b) => b.criadoEm.getTime() - a.criadoEm.getTime(),
  )[0];
  return {
    id: doc._id,
    participanteId: doc.compradorId,
    cupomId: doc.cupomId,
    status: doc.status as StatusPedido,
    itens: doc.itens.map((item) => ({
      id: item._id,
      eventoId: item.eventoId,
      loteId: item.loteId,
      quantidade: item.quantidade,
      precoUnitarioCentavos: item.precoUnitarioCentavos,
    })),
    criadoEm: doc.criadoEm,
    reservadoAte: doc.reservadoAte,
    participantes: doc.participantesRascunho as readonly RascunhoDeParticipante[] | null,
    cobranca: doc.cobranca,
    metodoPagamento: (ultimoPagamento?.metodo as MetodoDePagamento | undefined) ?? null,
  };
}

async function buscarOuFalhar(pedidoId: string): Promise<Pedido> {
  const doc = await colecoes.pedidos().findOne({ _id: pedidoId });
  if (!doc) throw new PedidoNaoEncontradoError();
  return paraPedido(doc);
}

async function atualizarCampos(pedidoId: string, campos: Partial<PedidoDoc>): Promise<Pedido> {
  const doc = await colecoes
    .pedidos()
    .findOneAndUpdate({ _id: pedidoId }, { $set: campos }, { returnDocument: 'after' });
  if (!doc) throw new PedidoNaoEncontradoError();
  return paraPedido(doc);
}

class MongoPedidosRepository implements PedidosRepository {
  async criarAberto(participanteId: string): Promise<Pedido> {
    const doc: PedidoDoc = {
      _id: randomUUID(),
      compradorId: participanteId,
      status: 'aberto',
      criadoEm: new Date(),
      reservadoAte: null,
      confirmadoEm: null,
      cupomId: null,
      participantesRascunho: null,
      cobranca: null,
      itens: [],
      pagamentos: [],
    };
    await colecoes.pedidos().insertOne(doc);
    return paraPedido(doc);
  }

  async buscarPorId(pedidoId: string): Promise<Pedido | null> {
    const doc = await colecoes.pedidos().findOne({ _id: pedidoId });
    return doc ? paraPedido(doc) : null;
  }

  async buscarAbertoPorParticipante(participanteId: string): Promise<Pedido | null> {
    const doc = await colecoes
      .pedidos()
      .findOne({ compradorId: participanteId, status: 'aberto' }, { sort: { criadoEm: -1 } });
    return doc ? paraPedido(doc) : null;
  }

  /** Antes: JOIN inscricao × participante. Agora o CPF está dentro da
   *  inscrição, e o índice (eventoId, participante.cpf, status) responde. */
  async participanteJaInscritoNoEvento(eventoId: string, cpf: string): Promise<boolean> {
    const total = await colecoes
      .inscricoes()
      .countDocuments({ eventoId, 'participante.cpf': cpf, status: 'ativa' }, { limit: 1 });
    return total > 0;
  }

  /**
   * Substitui o `INSERT ... ON CONFLICT (pedido_id, lote_id) DO UPDATE`:
   * primeiro tenta incrementar o item do mesmo lote; se não houver, insere
   * com `itens.loteId: {$ne}` no filtro — se outra requisição inseriu o item
   * entre as duas operações, o laço volta e incrementa.
   */
  async adicionarItem(pedidoId: string, item: Omit<ItemPedido, 'id'>): Promise<Pedido> {
    const pedidos = colecoes.pedidos();
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const incremento = await pedidos.updateOne(
        { _id: pedidoId, 'itens.loteId': item.loteId },
        { $inc: { 'itens.$.quantidade': item.quantidade } },
      );
      if (incremento.matchedCount > 0) return buscarOuFalhar(pedidoId);

      const insercao = await pedidos.updateOne(
        { _id: pedidoId, 'itens.loteId': { $ne: item.loteId } },
        {
          $push: {
            itens: {
              _id: randomUUID(),
              loteId: item.loteId,
              eventoId: item.eventoId,
              quantidade: item.quantidade,
              precoUnitarioCentavos: item.precoUnitarioCentavos,
            },
          },
        },
      );
      if (insercao.matchedCount > 0) return buscarOuFalhar(pedidoId);
      if (!(await pedidos.countDocuments({ _id: pedidoId }, { limit: 1 }))) break;
    }
    throw new PedidoNaoEncontradoError();
  }

  definirCupom(pedidoId: string, cupomId: string | null): Promise<Pedido> {
    return atualizarCampos(pedidoId, { cupomId });
  }

  /**
   * Status do pedido e aprovação do pagamento pendente no mesmo `updateOne`
   * (arrayFilters seleciona os pagamentos `pendente`) — antes, dois UPDATEs
   * numa transação.
   *
   * Ao confirmar, a data é copiada para as inscrições do pedido: a lista de
   * inscritos mostra "comprado em" sem precisar ler o pedido. É a única
   * escrita em duas collections; ela é idempotente e pode ser refeita.
   */
  async atualizarStatus(pedidoId: string, status: StatusPedido): Promise<Pedido> {
    const agora = new Date();
    const confirmar = status === 'confirmado';
    const doc = await colecoes.pedidos().findOneAndUpdate(
      { _id: pedidoId },
      {
        $set: {
          status,
          ...(confirmar
            ? {
                confirmadoEm: agora,
                'pagamentos.$[pendente].status': 'aprovado',
                'pagamentos.$[pendente].pagoEm': agora,
              }
            : {}),
        },
      },
      {
        returnDocument: 'after',
        ...(confirmar ? { arrayFilters: [{ 'pendente.status': 'pendente' }] } : {}),
      },
    );
    if (!doc) throw new PedidoNaoEncontradoError();

    if (confirmar) {
      await colecoes
        .inscricoes()
        .updateMany({ pedidoId }, { $set: { pedidoConfirmadoEm: agora } });
    }
    return paraPedido(doc);
  }

  /** `reservadoAte: null` no filtro faz a checagem "primeira vez"
   *  atomicamente, como o `WHERE reservado_ate IS NULL` do SQL. */
  async garantirReserva(pedidoId: string, expiraEm: Date): Promise<Pedido> {
    await colecoes
      .pedidos()
      .updateOne({ _id: pedidoId, reservadoAte: null }, { $set: { reservadoAte: expiraEm } });
    return buscarOuFalhar(pedidoId);
  }

  definirParticipantes(pedidoId: string, participantes: readonly RascunhoDeParticipante[]): Promise<Pedido> {
    return atualizarCampos(pedidoId, {
      participantesRascunho: participantes.map((p) => ({ ...p })) as RascunhoDeParticipanteDoc[],
    });
  }

  definirCobranca(pedidoId: string, cobranca: DadosDeCobranca): Promise<Pedido> {
    return atualizarCampos(pedidoId, {
      cobranca: { cpf: cobranca.cpf, endereco: { ...cobranca.endereco } },
    });
  }

  /**
   * O pagamento nasce `pendente` com o método escolhido na Etapa 1; qualquer
   * pendente anterior é substituído. Um update com pipeline faz tudo numa
   * operação atômica: calcula o valor a partir dos itens embutidos, remove
   * os pendentes e anexa o novo — antes, SELECT + DELETE + INSERT numa
   * transação.
   */
  async definirMetodoPagamento(pedidoId: string, metodo: MetodoDePagamento): Promise<Pedido> {
    const doc = await colecoes.pedidos().findOneAndUpdate(
      { _id: pedidoId },
      [
        {
          $set: {
            pagamentos: {
              $concatArrays: [
                { $filter: { input: '$pagamentos', cond: { $ne: ['$$this.status', 'pendente'] } } },
                [
                  {
                    _id: randomUUID(),
                    metodo: { $literal: metodo },
                    status: 'pendente',
                    valorCentavos: {
                      $sum: {
                        $map: {
                          input: '$itens',
                          in: { $multiply: ['$$this.quantidade', '$$this.precoUnitarioCentavos'] },
                        },
                      },
                    },
                    codigoExterno: null,
                    criadoEm: new Date(),
                    pagoEm: null,
                  },
                ],
              ],
            },
          },
        },
      ],
      { returnDocument: 'after' },
    );
    if (!doc) throw new PedidoNaoEncontradoError();
    return paraPedido(doc);
  }

  async listarPorParticipante(participanteId: string): Promise<readonly Pedido[]> {
    const docs = await colecoes
      .pedidos()
      .find({ compradorId: participanteId })
      .sort({ criadoEm: -1 })
      .toArray();
    return docs.map(paraPedido);
  }
}

export const mongoPedidosRepository: PedidosRepository = new MongoPedidosRepository();
