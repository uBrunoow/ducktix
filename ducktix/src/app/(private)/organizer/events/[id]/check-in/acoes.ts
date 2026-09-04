'use server';

import { revalidatePath } from 'next/cache';
import {
  desfazerCheckIn,
  montarPainelDaPortaria,
  realizarCheckIn,
  type LeituraDaPortaria,
  type PainelDaPortaria,
} from '@/server/participation/application/check-in';
import { drizzleInscricoesRepository as inscricoesRepository } from '@/server/participation/infrastructure/drizzle-inscricoes';

export async function acaoLerCodigo(
  eventoId: string,
  codigo: string,
): Promise<LeituraDaPortaria> {
  const leitura = await realizarCheckIn(
    inscricoesRepository,
    eventoId,
    codigo,
    new Date(),
  );
  if (leitura.aceito) {
    revalidatePath(`/organizer/events/${eventoId}`);
    revalidatePath(`/organizer/events/${eventoId}/attendees`);
  }
  return leitura;
}

export async function acaoDesfazerCheckIn(
  eventoId: string,
  inscricaoId: string,
): Promise<boolean> {
  const desfeito = await desfazerCheckIn(inscricoesRepository, inscricaoId);
  if (desfeito) {
    revalidatePath(`/organizer/events/${eventoId}`);
    revalidatePath(`/organizer/events/${eventoId}/attendees`);
  }
  return desfeito;
}

export async function acaoAtualizarPainelDaPortaria(
  eventoId: string,
): Promise<PainelDaPortaria> {
  return montarPainelDaPortaria(inscricoesRepository, eventoId, new Date());
}
