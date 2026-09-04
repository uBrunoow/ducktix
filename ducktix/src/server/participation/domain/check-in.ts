/**
 * Domínio da portaria: as regras que decidem se um código lido na entrada
 * vale ou não. Sem dependência de Postgres, HTTP, câmera ou React — a mesma
 * função serve à leitura por câmera, à digitação manual e a um teste.
 *
 * Check-in é a sexta tabela associativa do trabalho (`check_in`: ingresso ×
 * operador) e o processo de negócio que ela materializa.
 */

import { type Inscricao, nomeCompleto } from './inscricao';

/**
 * Por que uma leitura foi recusada. É um tipo fechado de propósito: a tela
 * da portaria precisa dizer o motivo exato em voz alta para quem está na
 * fila, e "inválido" genérico não resolve fila nenhuma.
 */
export type MotivoDeRecusa =
  | 'nao-encontrado'
  | 'outro-evento'
  | 'cancelado'
  | 'ja-utilizado';

export interface CheckInAceito {
  readonly aceito: true;
  readonly inscricao: Inscricao;
}

export interface CheckInRecusado {
  readonly aceito: false;
  readonly motivo: MotivoDeRecusa;
  /** A inscrição encontrada, quando o problema não foi não achar nada. */
  readonly inscricao: Inscricao | null;
}

export type ResultadoDeCheckIn = CheckInAceito | CheckInRecusado;

/**
 * Decide se a leitura pode virar um check-in. Não escreve nada — quem
 * persiste é a camada de aplicação, que só grava se o resultado for aceito.
 *
 * A ordem das checagens é a ordem em que elas importam na porta: primeiro
 * "esse código existe?", depois "é deste evento?", depois "está válido?" e
 * por último "já entrou?" — o caso mais comum de recusa numa fila real, e o
 * único em que devolver o horário anterior ajuda a resolver a discussão.
 */
export function avaliarCheckIn(
  inscricao: Inscricao | null,
  eventoId: string,
): ResultadoDeCheckIn {
  if (inscricao === null) return { aceito: false, motivo: 'nao-encontrado', inscricao: null };
  if (inscricao.eventoId !== eventoId) return { aceito: false, motivo: 'outro-evento', inscricao };
  if (inscricao.cancelada) return { aceito: false, motivo: 'cancelado', inscricao };
  if (inscricao.checkInEm !== null) return { aceito: false, motivo: 'ja-utilizado', inscricao };
  return { aceito: true, inscricao };
}

const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Mensagem que a portaria lê na tela — sempre nomeando a pessoa quando dá. */
export function mensagemDeRecusa(resultado: CheckInRecusado): string {
  const quem = resultado.inscricao ? nomeCompleto(resultado.inscricao) : null;

  switch (resultado.motivo) {
    case 'nao-encontrado':
      return 'Código não encontrado. Confira se o ingresso é da Ducktix.';
    case 'outro-evento':
      return `Este ingresso é de outro evento${quem ? ` (${quem})` : ''}.`;
    case 'cancelado':
      return `Inscrição cancelada${quem ? ` — ${quem}` : ''}. A entrada não vale.`;
    case 'ja-utilizado':
      return `Já utilizado${resultado.inscricao?.checkInEm ? ` às ${hora.format(resultado.inscricao.checkInEm)}` : ''}${quem ? ` por ${quem}` : ''}.`;
  }
}

/** Normaliza o que veio da câmera ou do teclado antes de procurar no repositório. */
export function normalizarCodigo(bruto: string): string {
  return bruto.trim().toLowerCase();
}
