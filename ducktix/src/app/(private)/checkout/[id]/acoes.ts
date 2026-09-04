'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { aplicarCupom, avancarParaPagamento } from '@/server/ticketing/application/checkout';
import { drizzlePedidosRepository as pedidosRepository } from '@/server/ticketing/infrastructure/drizzle-pedidos';
import { drizzleCupomRepository as cupomRepository } from '@/server/ticketing/infrastructure/drizzle-cupons';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { esquemaAplicarCupom, esquemaEtapaParticipantes } from './schemas';

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
  try {
    await avancarParaPagamento(
      pedidosRepository,
      pedidoId,
      sessao.usuarioId,
      {
        participantes: analise.data.participantes,
        cobranca: { cpf: analise.data.cpf, endereco: analise.data.endereco },
        metodoPagamento: analise.data.metodoPagamento,
      },
      new Date(),
    );
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }

  redirect(`/checkout/${pedidoId}/payment`);
}
