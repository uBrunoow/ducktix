'use server';

import { redirect } from 'next/navigation';
import { confirmarPedido } from '@/server/ticketing/application/checkout';
import { drizzlePedidosRepository as pedidosRepository } from '@/server/ticketing/infrastructure/drizzle-pedidos';
import { drizzleCupomRepository as cupomRepository } from '@/server/ticketing/infrastructure/drizzle-cupons';
import { drizzleIngressosRepository as memoriaIngressosRepository } from '@/server/participation/infrastructure/drizzle-ingressos';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { enviarEmailDeConfirmacaoDoPedido } from '@/server/notifications/infrastructure/resend-email';

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
  let resultado: Awaited<ReturnType<typeof confirmarPedido>>;
  try {
    resultado = await confirmarPedido(
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

  try {
    const emails = [...new Set(
      resultado.pedido.participantes?.map((participante) => participante.email.trim().toLowerCase()) ?? [],
    )];
    const eventos = new Map(
      await Promise.all(
        resultado.ingressos.map(async (ingresso) => [
          ingresso.eventoId,
          await catalogoPublicoRepository.buscarPorId(ingresso.eventoId),
        ] as const),
      ),
    );
    await enviarEmailDeConfirmacaoDoPedido({
      emails,
      pedido: resultado.pedido,
      ingressos: resultado.ingressos,
      eventos: new Map([...eventos].filter((entry): entry is [string, NonNullable<typeof entry[1]>] => entry[1] !== null)),
    });
  } catch (erro) {
    if (erro instanceof Error) {
      console.error('Pedido confirmado, mas houve falha ao enviar o e-mail de confirmação:', erro);
    } else {
      console.error('Pedido confirmado, mas houve falha desconhecida ao enviar o e-mail de confirmação:', erro);
    }
  }

  redirect(`/checkout/${pedidoId}/thank-you`);
}
