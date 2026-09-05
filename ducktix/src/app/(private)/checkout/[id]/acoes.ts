'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { aplicarCupom, avancarParaPagamento } from '@/server/ticketing/application/checkout';
import { drizzlePedidosRepository as pedidosRepository } from '@/server/ticketing/infrastructure/drizzle-pedidos';
import { drizzleCupomRepository as cupomRepository } from '@/server/ticketing/infrastructure/drizzle-cupons';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { esquemaAplicarCupom, esquemaEtapaParticipantes } from './schemas';
import { totalComDescontoCentavos } from '@/server/ticketing/domain/pedido';
import { acaoConfirmarPedido } from './payment/acoes';

export interface RespostaDoCheckout {
  readonly erro?: string;
}

async function exigirSessao() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/login');
  return sessao;
}

export async function acaoAplicarCupom(pedidoId: string, dados: unknown): Promise<RespostaDoCheckout> {
  const analise = esquemaAplicarCupom.safeParse(dados);
  if (!analise.success) return { erro: 'Informe um código de cupom.' };

  const sessao = await exigirSessao();
  try {
    await aplicarCupom(pedidosRepository, cupomRepository, pedidoId, sessao.usuarioId, analise.data.codigo, new Date());
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }
  // O resumo do pedido é renderizado no servidor: sem revalidar, o desconto
  // fica salvo mas o total na tela continua o antigo.
  revalidatePath(`/checkout/${pedidoId}`);
  revalidatePath(`/checkout/${pedidoId}/payment`);
  return {};
}

export async function acaoAvancarParaPagamento(pedidoId: string, dados: unknown): Promise<RespostaDoCheckout> {
  const analise = esquemaEtapaParticipantes.safeParse(dados);
  if (!analise.success) {
    const primeiraMensagem = analise.error.issues[0]?.message ?? 'Dados inválidos.';
    return { erro: primeiraMensagem };
  }

  const sessao = await exigirSessao();
  let pedidoAtualizado: Awaited<ReturnType<typeof avancarParaPagamento>>;
  try {
    pedidoAtualizado = await avancarParaPagamento(
      pedidosRepository,
      cupomRepository,
      pedidoId,
      sessao.usuarioId,
      {
        participantes: analise.data.participantes,
        cobranca: analise.data.cpf && analise.data.endereco
          ? { cpf: analise.data.cpf, endereco: analise.data.endereco }
          : null,
        metodoPagamento: analise.data.metodoPagamento ?? null,
      },
      new Date(),
    );
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }

  const cupom = pedidoAtualizado.cupomId
    ? await cupomRepository.buscarPorId(pedidoAtualizado.cupomId)
    : null;
  if (totalComDescontoCentavos(pedidoAtualizado, cupom) === 0) {
    await acaoConfirmarPedido(pedidoId);
  }

  redirect(`/checkout/${pedidoId}/payment`);
}

export async function acaoCancelarPedido(pedidoId: string): Promise<RespostaDoCheckout> {
  const sessao = await exigirSessao();
  try {
    const pedido = await pedidosRepository.buscarPorId(pedidoId);
    if (!pedido || pedido.participanteId !== sessao.usuarioId) {
      return { erro: 'Pedido não encontrado.' };
    }
    if (pedido.status !== 'aberto') return { erro: 'Este pedido já foi finalizado.' };
    await pedidosRepository.atualizarStatus(pedidoId, 'cancelado');
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }
  redirect('/events');
}
