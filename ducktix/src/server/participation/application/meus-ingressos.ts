import type { PedidosRepository } from '@/server/ticketing/ports/pedidos';
import type { Ingresso } from '../domain/ingresso';
import type { IngressosRepository } from '../ports/ingressos';

export interface IngressoComEvento {
  readonly ingresso: Ingresso;
  readonly eventoId: string;
}

/**
 * Ingressos do usuário logado: por dono do pedido, não por nome no ingresso
 * — um usuário vê os ingressos que comprou, mesmo os emitidos para
 * terceiros.
 */
export async function listarIngressosDoParticipante(
  pedidos: PedidosRepository,
  ingressos: IngressosRepository,
  participanteId: string,
): Promise<readonly IngressoComEvento[]> {
  const pedidosDoUsuario = await pedidos.listarPorParticipante(participanteId);
  const itemIds = pedidosDoUsuario.flatMap((p) => p.itens.map((i) => i.id));
  if (itemIds.length === 0) return [];

  const emitidos = await ingressos.listarPorItensDePedido(itemIds);
  return emitidos.map((ingresso) => ({ ingresso, eventoId: ingresso.eventoId }));
}

/**
 * Um ingresso específico do usuário logado, para a tela de detalhamento.
 * Reaproveita a mesma regra de posse de `listarIngressosDoParticipante` —
 * `null` tanto para "não existe" quanto para "não é seu", sem distinguir os
 * dois casos na borda (não vaza quais ingressos existem).
 */
export async function buscarIngressoDoParticipante(
  pedidos: PedidosRepository,
  ingressos: IngressosRepository,
  participanteId: string,
  ingressoId: string,
): Promise<IngressoComEvento | null> {
  const todos = await listarIngressosDoParticipante(pedidos, ingressos, participanteId);
  return todos.find(({ ingresso }) => ingresso.id === ingressoId) ?? null;
}
