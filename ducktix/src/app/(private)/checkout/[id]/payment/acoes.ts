'use server';

import { redirect } from 'next/navigation';
import { confirmarPedido } from '@/server/ticketing/application/checkout';
import { drizzlePedidosRepository as pedidosRepository } from '@/server/ticketing/infrastructure/drizzle-pedidos';
import { drizzleCupomRepository as cupomRepository } from '@/server/ticketing/infrastructure/drizzle-cupons';
import { drizzleIngressosRepository as memoriaIngressosRepository } from '@/server/participation/infrastructure/drizzle-ingressos';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { drizzleUsuariosRepository as usuariosRepository } from '@/server/identity/infrastructure/drizzle-usuarios';
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
  const compradoEm = new Date();
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
    const comprador = await usuariosRepository.buscarPorId(sessao.usuarioId);
    if (!comprador) throw new Error('Comprador não encontrado após confirmar o pedido.');
    const emails = [...new Set(
      [
        comprador.email,
        ...(resultado.pedido.participantes?.map((participante) => participante.email.trim().toLowerCase()) ?? []),
      ].filter((email): email is string => Boolean(email)),
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
      compradoEm,
      ingressos: resultado.ingressos,
      eventos: new Map([...eventos].filter((entry): entry is [string, NonNullable<typeof entry[1]>] => entry[1] !== null)),
      comprador: { nome: comprador.nome, email: comprador.email },
      cupom: resultado.pedido.cupomId
        ? await cupomRepository.buscarPorId(resultado.pedido.cupomId)
        : null,
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
