'use server';

import { redirect } from 'next/navigation';
import { confirmarPedido } from '@/server/ticketing/application/checkout';
import { drizzlePedidosRepository as pedidosRepository } from '@/server/ticketing/infrastructure/drizzle-pedidos';
import { drizzleCupomRepository as cupomRepository } from '@/server/ticketing/infrastructure/drizzle-cupons';
import { drizzleIngressosRepository as memoriaIngressosRepository } from '@/server/participation/infrastructure/drizzle-ingressos';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';

export interface RespostaDoPagamento {
  readonly erro?: string;
}

async function exigirSessao() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/login');
  return sessao;
}

/**
 * Os campos do instrumento (número de cartão etc.) são validados no cliente
 * pelo schema da Etapa 2, mas não viajam pro servidor — não há gateway
 * nesta fase, então guardá-los seria só simular dado sensível sem
 * necessidade. Confirmar aqui é o que efetivamente "paga" (mock).
 */
export async function acaoConfirmarPedido(pedidoId: string): Promise<RespostaDoPagamento> {
  const sessao = await exigirSessao();
  try {
    await confirmarPedido(
      {
        pedidos: pedidosRepository,
        cupons: cupomRepository,
        ingressos: memoriaIngressosRepository,
        catalogo: catalogoPublicoRepository,
      },
      pedidoId,
      sessao.usuarioId,
      new Date(),
    );
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }

  redirect(`/checkout/${pedidoId}/thank-you`);
}
