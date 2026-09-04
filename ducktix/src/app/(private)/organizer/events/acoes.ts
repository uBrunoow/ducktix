'use server';

import { revalidatePath } from 'next/cache';
import { publicarEvento } from '@/server/event/application/criar-evento';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';

export interface RespostaDePublicar {
  readonly erro?: string;
}

export async function acaoPublicarEvento(eventoId: string): Promise<RespostaDePublicar> {
  try {
    await publicarEvento(catalogoPublicoRepository, eventoId);
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }
  revalidatePath('/organizer/events');
  return {};
}
