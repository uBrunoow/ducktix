import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/server/db/client';
import {
  ingresso as ingressoTabela,
  inscricao as inscricaoTabela,
  itemPedido as itemPedidoTabela,
  participante as participanteTabela,
} from '@/server/db/schema';
import type { DadosProfissionais, Ingresso, StatusIngresso } from '../domain/ingresso';
import type { DadosDeEmissao, IngressosRepository } from '../ports/ingressos';

function paraDadosProfissionais(linha: {
  linkedin: string | null;
  github: string | null;
  empresa: string | null;
  segmento: string | null;
  cargo: string | null;
  nivel: string | null;
}): DadosProfissionais | null {
  const preenchido = linha.linkedin || linha.github || linha.empresa || linha.segmento || linha.cargo || linha.nivel;
  if (!preenchido) return null;
  return {
    linkedin: linha.linkedin ?? '',
    github: linha.github ?? '',
    empresa: linha.empresa ?? '',
    segmento: linha.segmento ?? '',
    cargo: linha.cargo ?? '',
    nivel: linha.nivel ?? '',
  };
}

const SELECAO = {
  ingressoId: ingressoTabela.id,
  status: ingressoTabela.status,
  emitidoEm: ingressoTabela.emitidoEm,
  itemPedidoId: inscricaoTabela.itemPedidoId,
  eventoId: inscricaoTabela.eventoId,
  comoConheceu: inscricaoTabela.comoConheceu,
  nome: participanteTabela.nome,
  sobrenome: participanteTabela.sobrenome,
  email: participanteTabela.email,
  celular: participanteTabela.celular,
  nomeCracha: participanteTabela.nomeCracha,
  linkedin: participanteTabela.linkedin,
  github: participanteTabela.github,
  empresa: participanteTabela.empresa,
  segmento: participanteTabela.segmento,
  cargo: participanteTabela.cargo,
  nivel: participanteTabela.nivel,
} as const;

function paraIngresso(linha: Record<keyof typeof SELECAO, unknown>): Ingresso {
  const l = linha as {
    ingressoId: string;
    status: string;
    emitidoEm: Date;
    itemPedidoId: string;
    eventoId: string;
    comoConheceu: string | null;
    nome: string;
    sobrenome: string;
    email: string;
    celular: string | null;
    nomeCracha: string | null;
    linkedin: string | null;
    github: string | null;
    empresa: string | null;
    segmento: string | null;
    cargo: string | null;
    nivel: string | null;
  };
  return {
    id: l.ingressoId,
    itemPedidoId: l.itemPedidoId,
    eventoId: l.eventoId,
    participanteNome: l.nome,
    participanteSobrenome: l.sobrenome,
    participanteEmail: l.email,
    participanteCelular: l.celular ?? '',
    participanteNomeCracha: l.nomeCracha ?? '',
    dadosProfissionais: paraDadosProfissionais(l),
    comoConheceu: l.comoConheceu,
    status: l.status as StatusIngresso,
    emitidoEm: l.emitidoEm,
  };
}

function baseSelectDeIngressos() {
  return db
    .select(SELECAO)
    .from(ingressoTabela)
    .innerJoin(inscricaoTabela, eq(inscricaoTabela.id, ingressoTabela.inscricaoId))
    .innerJoin(participanteTabela, eq(participanteTabela.id, inscricaoTabela.participanteId));
}

class DrizzleIngressosRepository implements IngressosRepository {
  /**
   * Ingresso nominal — o participante não precisa ter conta (`usuario_id`
   * nulo em `participante`), ver docs/modelo-mudancas.md. `codigo` do
   * ingresso e o `id` devolvido ao domínio são o mesmo UUID de propósito: é
   * o valor que vai no QR do comprador e o que a portaria lê de volta.
   */
  async emitir(dados: DadosDeEmissao): Promise<Ingresso> {
    const [item] = await db
      .select({ loteId: itemPedidoTabela.loteId, precoUnitarioCentavos: itemPedidoTabela.precoUnitarioCentavos })
      .from(itemPedidoTabela)
      .where(eq(itemPedidoTabela.id, dados.itemPedidoId))
      .limit(1);
    if (!item) throw new Error('Item de pedido não encontrado para emitir o ingresso.');

    const ingressoId = randomUUID();

    await db.transaction(async (tx) => {
      const [participante] = await tx
        .insert(participanteTabela)
        .values({
          nome: dados.participanteNome,
          sobrenome: dados.participanteSobrenome,
          email: dados.participanteEmail,
          celular: dados.participanteCelular,
          nomeCracha: dados.participanteNomeCracha || null,
          linkedin: dados.dadosProfissionais?.linkedin || null,
          github: dados.dadosProfissionais?.github || null,
          empresa: dados.dadosProfissionais?.empresa || null,
          segmento: dados.dadosProfissionais?.segmento || null,
          cargo: dados.dadosProfissionais?.cargo || null,
          nivel: dados.dadosProfissionais?.nivel || null,
        })
        .returning({ id: participanteTabela.id });

      const [inscricao] = await tx
        .insert(inscricaoTabela)
        .values({
          eventoId: dados.eventoId,
          participanteId: participante.id,
          itemPedidoId: dados.itemPedidoId,
          loteId: item.loteId,
          precoPagoCentavos: item.precoUnitarioCentavos,
          comoConheceu: dados.comoConheceu,
        })
        .returning({ id: inscricaoTabela.id });

      await tx.insert(ingressoTabela).values({
        id: ingressoId,
        inscricaoId: inscricao.id,
        codigo: ingressoId,
      });
    });

    return {
      id: ingressoId,
      itemPedidoId: dados.itemPedidoId,
      eventoId: dados.eventoId,
      participanteNome: dados.participanteNome,
      participanteSobrenome: dados.participanteSobrenome,
      participanteEmail: dados.participanteEmail,
      participanteCelular: dados.participanteCelular,
      participanteNomeCracha: dados.participanteNomeCracha,
      dadosProfissionais: dados.dadosProfissionais,
      comoConheceu: dados.comoConheceu,
      status: 'emitido',
      emitidoEm: new Date(),
    };
  }

  async listarPorItensDePedido(itemPedidoIds: readonly string[]): Promise<readonly Ingresso[]> {
    if (itemPedidoIds.length === 0) return [];
    const linhas = await baseSelectDeIngressos().where(inArray(inscricaoTabela.itemPedidoId, itemPedidoIds));
    return linhas.map(paraIngresso);
  }
}

export const drizzleIngressosRepository: IngressosRepository = new DrizzleIngressosRepository();
