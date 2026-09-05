import type { DadosDeCobranca, ItemPedido, MetodoDePagamento, Pedido, RascunhoDeParticipante, StatusPedido } from '../domain/pedido';

/**
 * Port do repositório de pedidos. A implementação atual guarda tudo em
 * memória; trocá-la pelo repositório Drizzle não altera domínio nem
 * aplicação.
 */
export interface PedidosRepository {
  criarAberto(participanteId: string): Promise<Pedido>;
  buscarPorId(pedidoId: string): Promise<Pedido | null>;
  buscarAbertoPorParticipante(participanteId: string): Promise<Pedido | null>;
  participanteJaInscritoNoEvento(eventoId: string, cpf: string): Promise<boolean>;

  /** Adiciona um item novo, ou incrementa a quantidade se o mesmo `loteId` já está no pedido. */
  adicionarItem(
    pedidoId: string,
    item: Omit<ItemPedido, 'id'>,
  ): Promise<Pedido>;

  definirCupom(pedidoId: string, cupomId: string | null): Promise<Pedido>;
  atualizarStatus(pedidoId: string, status: StatusPedido): Promise<Pedido>;

  /** Garante uma reserva até `expiraEm` — só grava se ainda não houver
   *  `reservadoAte` (a primeira vez que o pedido ganha um item), não estende
   *  a cada chamada. */
  garantirReserva(pedidoId: string, expiraEm: Date): Promise<Pedido>;

  /** Etapa 1 do checkout: participantes + cobrança + método escolhido, salvos
   *  juntos porque saem do mesmo formulário. */
  definirParticipantes(pedidoId: string, participantes: readonly RascunhoDeParticipante[]): Promise<Pedido>;
  definirCobranca(pedidoId: string, cobranca: DadosDeCobranca): Promise<Pedido>;
  definirMetodoPagamento(pedidoId: string, metodo: MetodoDePagamento): Promise<Pedido>;

  /** Todos os pedidos do participante, em qualquer status, mais recentes primeiro. */
  listarPorParticipante(participanteId: string): Promise<readonly Pedido[]>;
}
