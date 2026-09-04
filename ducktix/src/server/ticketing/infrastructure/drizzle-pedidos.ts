import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import {
  itemPedido as itemPedidoTabela,
  lote as loteTabela,
  pagamento as pagamentoTabela,
  pedido as pedidoTabela,
} from '@/server/db/schema';
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

type LinhaDePedido = typeof pedidoTabela.$inferSelect;
type LinhaDeItem = typeof itemPedidoTabela.$inferSelect;

function paraItem(linha: LinhaDeItem): ItemPedido {
  return {
    id: linha.id,
    eventoId: '', // preenchido por montarPedidos — item_pedido não guarda evento_id direto.
    loteId: linha.loteId,
    quantidade: linha.quantidade,
    precoUnitarioCentavos: linha.precoUnitarioCentavos,
  };
}

async function montarPedidos(linhas: readonly LinhaDePedido[]): Promise<Pedido[]> {
  if (linhas.length === 0) return [];
  const ids = linhas.map((l) => l.id);

  const [linhasDeItem, linhasDePagamento] = await Promise.all([
    db
      .select({
        id: itemPedidoTabela.id,
        pedidoId: itemPedidoTabela.pedidoId,
        loteId: itemPedidoTabela.loteId,
        quantidade: itemPedidoTabela.quantidade,
        precoUnitarioCentavos: itemPedidoTabela.precoUnitarioCentavos,
        eventoId: loteTabela.eventoId,
      })
      .from(itemPedidoTabela)
      .innerJoin(loteTabela, eq(loteTabela.id, itemPedidoTabela.loteId))
      .where(inArray(itemPedidoTabela.pedidoId, ids)),
    db
      .select({ pedidoId: pagamentoTabela.pedidoId, metodo: pagamentoTabela.metodo })
      .from(pagamentoTabela)
      .where(inArray(pagamentoTabela.pedidoId, ids))
      .orderBy(desc(pagamentoTabela.criadoEm)),
  ]);

  const itensPorPedido = new Map<string, ItemPedido[]>();
  for (const linha of linhasDeItem) {
    const lista = itensPorPedido.get(linha.pedidoId) ?? [];
    lista.push({
      ...paraItem(linha),
      eventoId: linha.eventoId,
    });
    itensPorPedido.set(linha.pedidoId, lista);
  }

  const metodoPorPedido = new Map<string, MetodoDePagamento>();
  for (const linha of linhasDePagamento) {
    if (!metodoPorPedido.has(linha.pedidoId)) {
      metodoPorPedido.set(linha.pedidoId, linha.metodo as MetodoDePagamento);
    }
  }

  return linhas.map((linha): Pedido => ({
    id: linha.id,
    participanteId: linha.compradorId,
    cupomId: linha.cupomId,
    status: linha.status as StatusPedido,
    itens: itensPorPedido.get(linha.id) ?? [],
    criadoEm: linha.criadoEm,
    reservadoAte: linha.reservadoAte,
    participantes: (linha.participantesRascunho as readonly RascunhoDeParticipante[] | null) ?? null,
    cobranca:
      linha.cobrancaCpf && linha.cobrancaCep && linha.cobrancaLogradouro && linha.cobrancaCidade && linha.cobrancaUf
        ? {
            cpf: linha.cobrancaCpf,
            endereco: {
              cep: linha.cobrancaCep,
              logradouro: linha.cobrancaLogradouro,
              numero: linha.cobrancaNumero ?? '',
              complemento: linha.cobrancaComplemento ?? '',
              bairro: linha.cobrancaBairro ?? '',
              cidade: linha.cobrancaCidade,
              uf: linha.cobrancaUf,
            },
          }
        : null,
    metodoPagamento: metodoPorPedido.get(linha.id) ?? null,
  }));
}

class DrizzlePedidosRepository implements PedidosRepository {
  async criarAberto(participanteId: string): Promise<Pedido> {
    const [linha] = await db
      .insert(pedidoTabela)
      .values({ compradorId: participanteId })
      .returning();
    const [pedido] = await montarPedidos([linha]);
    return pedido;
  }

  async buscarPorId(pedidoId: string): Promise<Pedido | null> {
    const [linha] = await db.select().from(pedidoTabela).where(eq(pedidoTabela.id, pedidoId)).limit(1);
    if (!linha) return null;
    const [pedido] = await montarPedidos([linha]);
    return pedido;
  }

  async buscarAbertoPorParticipante(participanteId: string): Promise<Pedido | null> {
    const [linha] = await db
      .select()
      .from(pedidoTabela)
      .where(and(eq(pedidoTabela.compradorId, participanteId), eq(pedidoTabela.status, 'aberto')))
      .orderBy(desc(pedidoTabela.criadoEm))
      .limit(1);
    if (!linha) return null;
    const [pedido] = await montarPedidos([linha]);
    return pedido;
  }

  async adicionarItem(pedidoId: string, item: Omit<ItemPedido, 'id'>): Promise<Pedido> {
    await db
      .insert(itemPedidoTabela)
      .values({
        pedidoId,
        loteId: item.loteId,
        quantidade: item.quantidade,
        precoUnitarioCentavos: item.precoUnitarioCentavos,
      })
      .onConflictDoUpdate({
        target: [itemPedidoTabela.pedidoId, itemPedidoTabela.loteId],
        set: { quantidade: sql`${itemPedidoTabela.quantidade} + ${item.quantidade}` },
      });

    const pedido = await this.buscarPorId(pedidoId);
    if (!pedido) throw new PedidoNaoEncontradoError();
    return pedido;
  }

  async definirCupom(pedidoId: string, cupomId: string | null): Promise<Pedido> {
    await db.update(pedidoTabela).set({ cupomId }).where(eq(pedidoTabela.id, pedidoId));
    const pedido = await this.buscarPorId(pedidoId);
    if (!pedido) throw new PedidoNaoEncontradoError();
    return pedido;
  }

  async atualizarStatus(pedidoId: string, status: StatusPedido): Promise<Pedido> {
    await db.transaction(async (tx) => {
      await tx
        .update(pedidoTabela)
        .set({ status, confirmadoEm: status === 'confirmado' ? new Date() : undefined })
        .where(eq(pedidoTabela.id, pedidoId));

      if (status === 'confirmado') {
        await tx
          .update(pagamentoTabela)
          .set({ status: 'aprovado', pagoEm: new Date() })
          .where(and(eq(pagamentoTabela.pedidoId, pedidoId), eq(pagamentoTabela.status, 'pendente')));
      }
    });

    const pedido = await this.buscarPorId(pedidoId);
    if (!pedido) throw new PedidoNaoEncontradoError();
    return pedido;
  }

  /** Só grava se `reservado_ate` ainda estiver vazio — `WHERE ... IS NULL`
   *  faz a checagem "primeira vez" atomicamente, sem ler antes de escrever. */
  async garantirReserva(pedidoId: string, expiraEm: Date): Promise<Pedido> {
    await db
      .update(pedidoTabela)
      .set({ reservadoAte: expiraEm })
      .where(and(eq(pedidoTabela.id, pedidoId), isNull(pedidoTabela.reservadoAte)));

    const pedido = await this.buscarPorId(pedidoId);
    if (!pedido) throw new PedidoNaoEncontradoError();
    return pedido;
  }

  async definirParticipantes(pedidoId: string, participantes: readonly RascunhoDeParticipante[]): Promise<Pedido> {
    await db
      .update(pedidoTabela)
      .set({ participantesRascunho: participantes as unknown as (typeof pedidoTabela.$inferInsert)['participantesRascunho'] })
      .where(eq(pedidoTabela.id, pedidoId));
    const pedido = await this.buscarPorId(pedidoId);
    if (!pedido) throw new PedidoNaoEncontradoError();
    return pedido;
  }

  async definirCobranca(pedidoId: string, cobranca: DadosDeCobranca): Promise<Pedido> {
    await db
      .update(pedidoTabela)
      .set({
        cobrancaCpf: cobranca.cpf,
        cobrancaCep: cobranca.endereco.cep,
        cobrancaLogradouro: cobranca.endereco.logradouro,
        cobrancaNumero: cobranca.endereco.numero,
        cobrancaComplemento: cobranca.endereco.complemento,
        cobrancaBairro: cobranca.endereco.bairro,
        cobrancaCidade: cobranca.endereco.cidade,
        cobrancaUf: cobranca.endereco.uf,
      })
      .where(eq(pedidoTabela.id, pedidoId));
    const pedido = await this.buscarPorId(pedidoId);
    if (!pedido) throw new PedidoNaoEncontradoError();
    return pedido;
  }

  /** `pagamento` nasce aqui como 'pendente' — é o método escolhido na Etapa 1,
   *  ainda não executado. `atualizarStatus('confirmado')` o aprova. Qualquer
   *  pendente anterior deste pedido é substituído (o participante pode voltar
   *  e trocar o método antes de confirmar). */
  async definirMetodoPagamento(pedidoId: string, metodo: MetodoDePagamento): Promise<Pedido> {
    await db.transaction(async (tx) => {
      const itens = await tx
        .select({ quantidade: itemPedidoTabela.quantidade, preco: itemPedidoTabela.precoUnitarioCentavos })
        .from(itemPedidoTabela)
        .where(eq(itemPedidoTabela.pedidoId, pedidoId));
      const valorCentavos = itens.reduce((total, i) => total + i.quantidade * i.preco, 0);

      await tx
        .delete(pagamentoTabela)
        .where(and(eq(pagamentoTabela.pedidoId, pedidoId), eq(pagamentoTabela.status, 'pendente')));
      await tx.insert(pagamentoTabela).values({ pedidoId, metodo, valorCentavos });
    });

    const pedido = await this.buscarPorId(pedidoId);
    if (!pedido) throw new PedidoNaoEncontradoError();
    return pedido;
  }

  async listarPorParticipante(participanteId: string): Promise<readonly Pedido[]> {
    const linhas = await db
      .select()
      .from(pedidoTabela)
      .where(eq(pedidoTabela.compradorId, participanteId))
      .orderBy(desc(pedidoTabela.criadoEm));
    return montarPedidos(linhas);
  }
}

export const drizzlePedidosRepository: PedidosRepository = new DrizzlePedidosRepository();
