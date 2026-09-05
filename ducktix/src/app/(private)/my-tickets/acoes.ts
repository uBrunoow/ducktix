'use server';

import { revalidatePath } from 'next/cache';
import { solicitarCancelamento } from '@/server/participation/application/cancelamentos';
import { drizzleCancelamentosRepository } from '@/server/participation/infrastructure/drizzle-cancelamentos';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';

export async function acaoSolicitarCancelamento(
  ingressoId: string,
  pedidoId: string,
  motivo: string,
): Promise<{ ok: boolean; erro?: string }> {
  const sessao = await sessaoAtual();
  if (!sessao) return { ok: false, erro: 'Sua sessão expirou. Entre novamente.' };

  const resultado = await solicitarCancelamento(
    drizzleCancelamentosRepository,
    ingressoId,
    sessao.usuarioId,
    motivo.trim() || null,
  );
  if (resultado.ok) revalidatePath(`/my-tickets/${pedidoId}`);
  return resultado;
}
