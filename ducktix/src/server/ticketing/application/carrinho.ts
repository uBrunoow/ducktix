import type { CatalogoPublicoRepository } from '@/server/event/ports/catalogo-publico';
import { loteEstaAberto } from '@/server/event/domain/evento';
import { DURACAO_DA_RESERVA_MS, reservaExpirada, type Pedido } from '../domain/pedido';
import type { PedidosRepository } from '../ports/pedidos';

export class EventoNaoEncontradoError extends Error {
  constructor() {
    super('Este evento não existe.');
    this.name = 'EventoNaoEncontradoError';
  }
}

export class LoteIndisponivelError extends Error {
  constructor() {
    super('Este lote não está disponível para compra no momento.');
    this.name = 'LoteIndisponivelError';
  }
}

/**
 * "Adicionar ao carrinho": encontra ou cria o pedido aberto do participante e
 * adiciona (ou incrementa) o item. Carrinho não é uma entidade própria — é
 * este pedido com status 'aberto'.
 */
export async function adicionarAoCarrinho(
  pedidos: PedidosRepository,
  catalogo: CatalogoPublicoRepository,
  participanteId: string,
  eventoId: string,
  loteId: string,
  quantidade: number,
  agora: Date,
): Promise<Pedido> {
  const evento = await catalogo.buscarPorId(eventoId);
  if (!evento) throw new EventoNaoEncontradoError();

  const lote = evento.lotes.find((l) => l.id === loteId);
  if (!lote || !loteEstaAberto(lote, agora)) throw new LoteIndisponivelError();

  // Um pedido aberto cuja reserva já venceu está abandonado: nenhuma etapa do
  // checkout aceita mais confirmá-lo. Reaproveitá-lo prenderia o participante
  // num carrinho morto — toda tentativa de comprar cairia no mesmo pedido
  // expirado, sem saída pela interface. Cancela e começa outro.
  const existente = await pedidos.buscarAbertoPorParticipante(participanteId);
  if (existente && reservaExpirada(existente, agora)) {
    await pedidos.atualizarStatus(existente.id, 'cancelado');
  }
  const reutilizavel = existente && !reservaExpirada(existente, agora) ? existente : null;
  const pedido = reutilizavel ?? (await pedidos.criarAberto(participanteId));

  const comItem = await pedidos.adicionarItem(pedido.id, {
    eventoId,
    loteId,
    quantidade,
    precoUnitarioCentavos: lote.precoCentavos,
  });

  // Primeiro item do pedido dispara a reserva de 30min — chamadas seguintes
  // não estendem o prazo, `garantirReserva` só grava se ainda não houver uma.
  return pedidos.garantirReserva(comItem.id, new Date(agora.getTime() + DURACAO_DA_RESERVA_MS));
}
