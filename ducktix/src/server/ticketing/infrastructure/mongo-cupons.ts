import { randomUUID } from 'node:crypto';
import { colecoes, type CupomDoc, type UsoDeCupomDoc } from '@/server/db/colecoes';
import type { Cupom, TipoDesconto, UsoDeCupom } from '../domain/cupom';
import type { CupomRepository, DadosDeNovoCupom, DadosDeUsoDeCupom } from '../ports/cupons';

/** Os eventos vinculados já vêm no documento — no Postgres cada cupom
 *  custava uma consulta extra em `cupom_evento`. */
function paraCupom(doc: CupomDoc): Cupom {
  return {
    id: doc._id,
    codigo: doc.codigo,
    tipoDesconto: doc.tipoDesconto as TipoDesconto,
    valor: doc.valor,
    validoDe: doc.validoDe,
    validoAte: doc.validoAte,
    limiteDeUso: doc.limiteUso,
    usos: doc.usos,
    eventosIds: doc.eventosIds,
    ativo: doc.ativo,
    criadoEm: doc.criadoEm,
  };
}

function paraUso(cupomId: string, uso: UsoDeCupomDoc): UsoDeCupom {
  return {
    id: uso._id,
    cupomId,
    pedidoId: uso.pedidoId,
    eventoId: uso.eventoId,
    descontoCentavos: uso.descontoCentavos,
    usadoEm: uso.usadoEm,
  };
}

const normalizar = (codigo: string) => codigo.trim().toUpperCase();

class MongoCupomRepository implements CupomRepository {
  async buscarPorCodigo(codigo: string): Promise<Cupom | null> {
    const doc = await colecoes.cupons().findOne({ codigo: normalizar(codigo) });
    return doc ? paraCupom(doc) : null;
  }

  /** `eventosIds: eventoId` casa se o array contém o evento — o que antes
   *  era o INNER JOIN com `cupom_evento`. */
  async buscarPorCodigoNoEvento(codigo: string, eventoId: string): Promise<Cupom | null> {
    const doc = await colecoes.cupons().findOne({ codigo: normalizar(codigo), eventosIds: eventoId });
    return doc ? paraCupom(doc) : null;
  }

  async buscarPorId(cupomId: string): Promise<Cupom | null> {
    const doc = await colecoes.cupons().findOne({ _id: cupomId });
    return doc ? paraCupom(doc) : null;
  }

  async listarTodos(): Promise<readonly Cupom[]> {
    const docs = await colecoes
      .cupons()
      .find({}, { projection: { historicoDeUsos: 0 } })
      .sort({ criadoEm: -1 })
      .toArray();
    return docs.map(paraCupom);
  }

  async criar(dados: DadosDeNovoCupom): Promise<Cupom> {
    const doc: CupomDoc = {
      _id: randomUUID(),
      codigo: normalizar(dados.codigo),
      tipoDesconto: dados.tipoDesconto,
      valor: dados.valor,
      validoDe: dados.validoDe,
      validoAte: dados.validoAte,
      limiteUso: dados.limiteDeUso,
      usos: 0,
      ativo: true,
      criadoEm: new Date(),
      eventosIds: [...dados.eventosIds],
      historicoDeUsos: [],
    };
    await colecoes.cupons().insertOne(doc);
    return paraCupom(doc);
  }

  async definirAtivo(cupomId: string, ativo: boolean): Promise<void> {
    await colecoes.cupons().updateOne({ _id: cupomId }, { $set: { ativo } });
  }

  /**
   * Uso + contador num único `updateOne` (`$push` + `$inc`) — no Postgres
   * eram um INSERT e um UPDATE dentro de uma transação. O filtro reproduz as
   * duas restrições da Fase 1: `usos < limiteUso` (CHECK ck_cupom_usos) e um
   * uso por (pedido, evento) (UNIQUE uk_uso_cupom).
   */
  async registrarUso(dados: DadosDeUsoDeCupom): Promise<void> {
    const resultado = await colecoes.cupons().updateOne(
      {
        _id: dados.cupomId,
        $expr: { $lt: ['$usos', '$limiteUso'] },
        historicoDeUsos: { $not: { $elemMatch: { pedidoId: dados.pedidoId, eventoId: dados.eventoId } } },
      },
      {
        $inc: { usos: 1 },
        $push: {
          historicoDeUsos: {
            _id: randomUUID(),
            pedidoId: dados.pedidoId,
            eventoId: dados.eventoId,
            descontoCentavos: dados.descontoCentavos,
            usadoEm: new Date(),
          },
        },
      },
    );
    if (resultado.modifiedCount === 0) {
      throw new Error('Não foi possível registrar o uso do cupom: limite atingido ou uso já registrado.');
    }
  }

  async listarUsos(cupomId: string): Promise<readonly UsoDeCupom[]> {
    const doc = await colecoes.cupons().findOne({ _id: cupomId }, { projection: { historicoDeUsos: 1 } });
    return (doc?.historicoDeUsos ?? [])
      .map((uso) => paraUso(cupomId, uso))
      .sort((a, b) => b.usadoEm.getTime() - a.usadoEm.getTime());
  }

  /** Usos de todos os cupons num evento: `$unwind` do histórico embutido e
   *  filtro pelo evento — a agregação substitui o SELECT em `uso_de_cupom`. */
  async listarUsosPorEvento(eventoId: string): Promise<readonly UsoDeCupom[]> {
    const linhas = await colecoes
      .cupons()
      .aggregate<{ _id: string; uso: UsoDeCupomDoc }>([
        { $match: { 'historicoDeUsos.eventoId': eventoId } },
        { $unwind: '$historicoDeUsos' },
        { $match: { 'historicoDeUsos.eventoId': eventoId } },
        { $project: { uso: '$historicoDeUsos' } },
        { $sort: { 'uso.usadoEm': -1 } },
      ])
      .toArray();
    return linhas.map((linha) => paraUso(linha._id, linha.uso));
  }
}

export const mongoCupomRepository: CupomRepository = new MongoCupomRepository();
