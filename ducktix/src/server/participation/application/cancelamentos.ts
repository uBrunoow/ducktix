import type { CancelamentosRepository } from '../ports/cancelamentos';

export interface ResultadoDeCancelamento {
  readonly ok: boolean;
  readonly erro?: string;
}

export async function solicitarCancelamento(
  repositorio: CancelamentosRepository,
  ingressoId: string,
  compradorId: string,
  motivo: string | null,
): Promise<ResultadoDeCancelamento> {
  const motivoNormalizado = motivo?.trim() || null;
  if (motivoNormalizado && motivoNormalizado.length > 200) {
    return { ok: false, erro: 'O motivo deve ter no máximo 200 caracteres.' };
  }
  const contexto = await repositorio.buscarContextoDoIngresso(ingressoId);
  if (!contexto || contexto.compradorId !== compradorId) {
    return { ok: false, erro: 'Ingresso não encontrado.' };
  }
  if (contexto.ingressoStatus !== 'emitido' || contexto.checkInEm) {
    return { ok: false, erro: 'Este ingresso não pode mais ter cancelamento solicitado.' };
  }
  const atual = await repositorio.buscarPorInscricao(contexto.inscricaoId);
  if (atual?.status === 'solicitado') {
    return { ok: false, erro: 'Já existe uma solicitação aguardando análise.' };
  }
  if (atual?.status === 'aprovado') {
    return { ok: false, erro: 'Este ingresso já foi cancelado.' };
  }
  await repositorio.solicitar(contexto.inscricaoId, motivoNormalizado);
  return { ok: true };
}
