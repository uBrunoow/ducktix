'use server';

import { revalidatePath } from 'next/cache';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { mongoCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/mongo-catalogo';
import { mongoCancelamentosRepository } from '@/server/participation/infrastructure/mongo-cancelamentos';

export async function acaoResolverCancelamento(
  eventoId: string,
  cancelamentoId: string,
  decisao: 'aprovado' | 'negado',
): Promise<{ ok: boolean; erro?: string }> {
  const sessao = await sessaoAtual();
  const evento = await catalogoPublicoRepository.buscarPorId(eventoId);
  if (!sessao || !evento || evento.organizadorUsuarioId !== sessao.usuarioId) {
    return { ok: false, erro: 'Você não tem permissão para resolver esta solicitação.' };
  }
  const cancelamento = await mongoCancelamentosRepository.resolver(
    cancelamentoId,
    eventoId,
    decisao,
  );
  if (!cancelamento) return { ok: false, erro: 'Solicitação já resolvida ou não encontrada.' };
  revalidatePath(`/organizer/events/${eventoId}/cancellations`);
  revalidatePath(`/organizer/events/${eventoId}/attendees`);
  revalidatePath(`/organizer/events/${eventoId}`);
  return { ok: true };
}
