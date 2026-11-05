/**
 * Datas do sistema seguem o horário de Brasília, onde quer que o código rode:
 * na Vercel o servidor está em UTC, e formatar sem fuso explícito mostra outra
 * hora e faz o HTML do servidor divergir do navegador.
 *
 * O Brasil não tem horário de verão desde 2019, então o deslocamento é fixo.
 */

export const FUSO_HORARIO = 'America/Sao_Paulo';

const DESLOCAMENTO = '-03:00';
const DESLOCAMENTO_MS = 3 * 60 * 60 * 1000;

/** `2026-12-12T19:00`, digitado no horário de Brasília → instante real. */
export function instanteNoBrasil(valor: string): Date {
  return new Date(`${valor}${DESLOCAMENTO}`);
}

/** Instante → `YYYY-MM-DDTHH:mm` no horário de Brasília (datetime-local). */
export function dataHoraNoBrasil(data: Date): string {
  return new Date(data.getTime() - DESLOCAMENTO_MS).toISOString().slice(0, 16);
}

/** Instante → `YYYY-MM-DD` no horário de Brasília. */
export function diaNoBrasil(data: Date): string {
  return dataHoraNoBrasil(data).slice(0, 10);
}
