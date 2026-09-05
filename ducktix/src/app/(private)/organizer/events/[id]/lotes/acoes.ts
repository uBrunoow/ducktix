'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { drizzleCatalogoPublicoRepository as catalogo } from '@/server/event/infrastructure/drizzle-catalogo';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { esquemaLoteDoEvento } from './schemas';

export interface RespostaDeLote {
  readonly erro?: string;
}

async function exigirDono(eventoId: string) {
  const sessao = await sessaoAtual();
  const evento = await catalogo.buscarPorId(eventoId);
  if (!sessao || sessao.papel !== 'organizador' || !evento || evento.organizadorUsuarioId !== sessao.usuarioId) {
    redirect('/organizer/events');
  }
}

function paraData(valor: string | undefined, fimDoDia = false): Date | null {
  if (!valor) return null;
  const data = new Date(`${valor}T${fimDoDia ? '23:59:59' : '00:00:00'}`);
  return Number.isNaN(data.getTime()) ? null : data;
}

function paraDados(analise: z.infer<typeof esquemaLoteDoEvento>) {
  return {
    nome: analise.nome,
    precoCentavos: Math.round(analise.precoReais * 100),
    vagas: analise.vagas,
    iniciaEm: paraData(analise.iniciaEm),
    encerraEm: paraData(analise.encerraEm, true),
  };
}

export async function acaoAdicionarLote(eventoId: string, dados: unknown): Promise<RespostaDeLote> {
  await exigirDono(eventoId);
  const analise = esquemaLoteDoEvento.safeParse(dados);
  if (!analise.success) return { erro: analise.error.issues[0]?.message ?? 'Dados inválidos.' };
  try {
    await catalogo.adicionarLote(eventoId, paraDados(analise.data));
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }
  revalidatePath(`/organizer/events/${eventoId}/lotes`);
  redirect(`/organizer/events/${eventoId}/lotes`);
}

export async function acaoAtualizarLote(eventoId: string, loteId: string, dados: unknown): Promise<RespostaDeLote> {
  await exigirDono(eventoId);
  const analise = esquemaLoteDoEvento.safeParse(dados);
  if (!analise.success) return { erro: analise.error.issues[0]?.message ?? 'Dados inválidos.' };
  try {
    await catalogo.atualizarLote(eventoId, loteId, paraDados(analise.data));
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }
  revalidatePath(`/organizer/events/${eventoId}/lotes`);
  redirect(`/organizer/events/${eventoId}/lotes`);
}

export async function acaoExcluirLote(eventoId: string, loteId: string): Promise<RespostaDeLote> {
  await exigirDono(eventoId);
  try {
    await catalogo.excluirLote(eventoId, loteId);
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }
  revalidatePath(`/organizer/events/${eventoId}/lotes`);
  return {};
}
