'use server';

import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { drizzleCupomRepository as cupomRepository } from '@/server/ticketing/infrastructure/drizzle-cupons';
import { esquemaCriarCupomDoEvento } from './schemas';

export interface RespostaDeCupomDoEvento {
  readonly erro?: string;
}

/**
 * Todo cupom criado nesta tela nasce vinculado exclusivamente ao evento atual.
 */
export async function acaoCriarCupomDoEvento(
  eventoId: string,
  dados: unknown,
): Promise<RespostaDeCupomDoEvento> {
  const analise = esquemaCriarCupomDoEvento.safeParse(dados);
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? 'Dados inválidos.' };
  }
  const valores = analise.data;

  const jaExiste = await cupomRepository.buscarPorCodigo(valores.codigo);
  if (jaExiste) return { erro: `Já existe um cupom com o código ${valores.codigo.toUpperCase()}.` };

  await cupomRepository.criar({
    codigo: valores.codigo,
    tipoDesconto: valores.tipoDesconto,
    // Percentual guarda o número puro; fixo guarda centavos.
    valor:
      valores.tipoDesconto === 'percentual'
        ? Math.round(valores.valor)
        : Math.round(valores.valor * 100),
    validoDe: new Date(`${valores.validoDe}T00:00:00`),
    validoAte: new Date(`${valores.validoAte}T23:59:59`),
    limiteDeUso: valores.limiteDeUso,
    eventosIds: [eventoId],
  });

  revalidatePath(`/organizer/events/${eventoId}/coupons`);
  redirect(`/organizer/events/${eventoId}/coupons` as Route);
}

export async function acaoDefinirCupomAtivoNoEvento(
  eventoId: string,
  cupomId: string,
  ativo: boolean,
): Promise<RespostaDeCupomDoEvento> {
  const cupom = await cupomRepository.buscarPorId(cupomId);
  if (!cupom) return { erro: 'Este cupom não existe.' };

  await cupomRepository.definirAtivo(cupomId, ativo);
  revalidatePath(`/organizer/events/${eventoId}/coupons`);
  revalidatePath(`/organizer/events/${eventoId}/coupons/${cupomId}`);
  return {};
}
