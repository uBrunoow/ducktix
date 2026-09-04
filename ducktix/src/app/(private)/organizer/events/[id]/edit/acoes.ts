'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  atualizarEvento,
  cancelarEvento,
  despublicarEvento,
  excluirEvento,
} from '@/server/event/application/criar-evento';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { esquemaEditarEvento } from './schemas';

export interface RespostaDeEdicao {
  readonly erro?: string;
}

function revalidarEvento(eventoId: string) {
  revalidatePath('/organizer/events');
  revalidatePath(`/organizer/events/${eventoId}`);
  revalidatePath('/events');
}

export async function acaoEditarEvento(
  eventoId: string,
  dados: unknown,
): Promise<RespostaDeEdicao> {
  const analise = esquemaEditarEvento.safeParse(dados);
  if (!analise.success) {
    return { erro: analise.error.issues[0]?.message ?? 'Dados inválidos.' };
  }
  const valores = analise.data;

  try {
    await atualizarEvento(catalogoPublicoRepository, eventoId, {
      nome: valores.nome,
      categoria: valores.categoria,
      modalidade: valores.modalidade,
      formatoOnline: valores.formatoOnline ?? null,
      local:
        valores.modalidade === 'online'
          ? null
          : (valores.local?.trim() ?? null),
      comecaEm: new Date(valores.comecaEm),
      terminaEm: new Date(valores.terminaEm),
      descricao: valores.descricao,
      imagemUrl: valores.imagemUrl,
      visibilidade: valores.visibilidade,
    });
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }

  revalidarEvento(eventoId);
  redirect(`/organizer/events/${eventoId}`);
}

export async function acaoDespublicarEvento(
  eventoId: string,
): Promise<RespostaDeEdicao> {
  try {
    await despublicarEvento(catalogoPublicoRepository, eventoId);
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }
  revalidarEvento(eventoId);
  return {};
}

export async function acaoCancelarEvento(
  eventoId: string,
): Promise<RespostaDeEdicao> {
  try {
    await cancelarEvento(catalogoPublicoRepository, eventoId);
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }
  revalidarEvento(eventoId);
  return {};
}

export async function acaoExcluirEvento(
  eventoId: string,
): Promise<RespostaDeEdicao> {
  try {
    await excluirEvento(catalogoPublicoRepository, eventoId);
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }
  revalidatePath('/organizer/events');
  revalidatePath('/events');
  redirect('/organizer/events');
}
