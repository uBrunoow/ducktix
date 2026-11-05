import { randomUUID } from 'node:crypto';
import { colecoes, type InscricaoDoc } from '@/server/db/colecoes';
import type { DadosProfissionais, Ingresso, StatusIngresso } from '../domain/ingresso';
import type { DadosDeEmissao, IngressosRepository } from '../ports/ingressos';

function paraDadosProfissionais(p: InscricaoDoc['participante']): DadosProfissionais | null {
  const preenchido = p.linkedin || p.github || p.empresa || p.segmento || p.cargo || p.nivel;
  if (!preenchido) return null;
  return {
    linkedin: p.linkedin ?? '',
    github: p.github ?? '',
    empresa: p.empresa ?? '',
    segmento: p.segmento ?? '',
    cargo: p.cargo ?? '',
    nivel: p.nivel ?? '',
  };
}

function paraIngresso(doc: InscricaoDoc): Ingresso {
  return {
    id: doc.ingresso.id,
    itemPedidoId: doc.itemPedidoId,
    eventoId: doc.eventoId,
    participanteNome: doc.participante.nome,
    participanteSobrenome: doc.participante.sobrenome,
    participanteCpf: doc.participante.cpf ?? '',
    participanteEmail: doc.participante.email,
    participanteCelular: doc.participante.celular ?? '',
    participanteNomeCracha: doc.participante.nomeCracha ?? '',
    dadosProfissionais: paraDadosProfissionais(doc.participante),
    comoConheceu: doc.comoConheceu,
    status: doc.ingresso.status as StatusIngresso,
    emitidoEm: doc.ingresso.emitidoEm,
  };
}

class MongoIngressosRepository implements IngressosRepository {
  /**
   * Emite um ingresso nominal: participante, inscrição e ingresso nascem num
   * único documento de `inscricoes` (no Postgres, três INSERTs numa
   * transação). `codigo` e `id` do ingresso são o mesmo UUID de propósito —
   * é o valor do QR do comprador e o que a portaria lê de volta.
   */
  async emitir(dados: DadosDeEmissao): Promise<Ingresso> {
    const pedido = await colecoes.pedidos().findOne(
      { 'itens._id': dados.itemPedidoId },
      { projection: { compradorId: 1, criadoEm: 1, confirmadoEm: 1, 'itens.$': 1 } },
    );
    const item = pedido?.itens[0];
    if (!pedido || !item) throw new Error('Item de pedido não encontrado para emitir o ingresso.');

    const evento = await colecoes
      .eventos()
      .findOne({ 'lotes._id': item.loteId }, { projection: { 'lotes.$': 1 } });
    const lote = evento?.lotes[0];
    if (!lote) throw new Error('Lote não encontrado para emitir o ingresso.');

    const agora = new Date();
    const ingressoId = randomUUID();
    const doc: InscricaoDoc = {
      _id: randomUUID(),
      eventoId: dados.eventoId,
      pedidoId: pedido._id,
      itemPedidoId: item._id,
      compradorId: pedido.compradorId,
      lote: { id: lote._id, nome: lote.nome },
      precoPagoCentavos: item.precoUnitarioCentavos,
      status: 'ativa',
      comoConheceu: dados.comoConheceu,
      inscritoEm: agora,
      pedidoCriadoEm: pedido.criadoEm,
      pedidoConfirmadoEm: pedido.confirmadoEm,
      participante: {
        nome: dados.participanteNome,
        sobrenome: dados.participanteSobrenome,
        email: dados.participanteEmail,
        cpf: dados.participanteCpf,
        celular: dados.participanteCelular,
        nomeCracha: dados.participanteNomeCracha || null,
        linkedin: dados.dadosProfissionais?.linkedin || null,
        github: dados.dadosProfissionais?.github || null,
        empresa: dados.dadosProfissionais?.empresa || null,
        segmento: dados.dadosProfissionais?.segmento || null,
        cargo: dados.dadosProfissionais?.cargo || null,
        nivel: dados.dadosProfissionais?.nivel || null,
      },
      ingresso: { id: ingressoId, codigo: ingressoId, status: 'emitido', emitidoEm: agora },
      checkIn: null,
      cancelamentos: [],
    };
    await colecoes.inscricoes().insertOne(doc);

    return {
      ...paraIngresso(doc),
      // Devolve exatamente o que foi informado, como o repositório SQL.
      participanteNomeCracha: dados.participanteNomeCracha,
      dadosProfissionais: dados.dadosProfissionais,
    };
  }

  async listarPorItensDePedido(itemPedidoIds: readonly string[]): Promise<readonly Ingresso[]> {
    if (itemPedidoIds.length === 0) return [];
    const docs = await colecoes
      .inscricoes()
      .find({ itemPedidoId: { $in: [...itemPedidoIds] } })
      .toArray();
    return docs.map(paraIngresso);
  }
}

export const mongoIngressosRepository: IngressosRepository = new MongoIngressosRepository();
