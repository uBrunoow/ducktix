'use server';

import { mongoCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/mongo-catalogo';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { adicionarAoCarrinho } from '@/server/ticketing/application/carrinho';
import { mongoPedidosRepository as pedidosRepository } from '@/server/ticketing/infrastructure/mongo-pedidos';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const esquema = z.object({
  eventoId: z.string().min(1),
  loteId: z.string().min(1),
  quantidade: z.number().int().min(1).max(8),
});

export interface RespostaDoCarrinho {
  readonly erro?: string;
}

export async function acaoAdicionarAoCarrinho(
  dados: unknown,
): Promise<RespostaDoCarrinho> {
  const analise = esquema.safeParse(dados);
  if (!analise.success) return { erro: 'Escolha inválida de ingresso.' };

  const sessao = await sessaoAtual();
  if (!sessao) {
    redirect(`/login?next=${encodeURIComponent('/events')}`);
  }

  let pedidoId: string;
  try {
    const pedido = await adicionarAoCarrinho(
      pedidosRepository,
      catalogoPublicoRepository,
      sessao.usuarioId,
      analise.data.eventoId,
      analise.data.loteId,
      analise.data.quantidade,
      new Date(),
    );
    pedidoId = pedido.id;
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }

  redirect(`/checkout/${pedidoId}`);
}
