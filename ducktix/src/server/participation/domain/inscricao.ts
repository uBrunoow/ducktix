/**
 * Domínio de inscrição: a linha que liga um participante a um evento, com o
 * lote que ele comprou e a presença no check-in. Sem dependência de
 * Postgres, HTTP ou React — ver docs/guidelines.md, "Camadas".
 *
 * É a tabela associativa central do trabalho (evento × participante), e é
 * dela que saem os relatórios de ocupação, presença e receita.
 */

import type { StatusIngresso } from './ingresso';

export interface Inscricao {
  readonly id: string;
  readonly eventoId: string;
  readonly pedidoId: string;
  readonly loteId: string;
  readonly loteNome: string;
  readonly precoPagoCentavos: number;
  readonly participanteNome: string;
  readonly participanteSobrenome: string;
  readonly participanteEmail: string;
  /**
   * O que o QR do ingresso carrega e o que a portaria lê. Corresponde a
   * `ingresso.codigo` no esquema — é único no sistema inteiro, não só
   * dentro do evento, porque a leitora não sabe de antemão qual evento está
   * apontando para ela.
   */
  readonly codigo: string;
  readonly compradoEm: Date;
  /** O participante desistiu antes do evento — não conta como inscrito ativo. */
  readonly cancelada: boolean;
  /**
   * Instante em que a portaria validou a entrada, ou `null` se a pessoa
   * ainda não entrou. É um fato registrado, não uma previsão: antes existia
   * um booleano `compareceu` que o seed sorteava, e não havia como o
   * check-in de verdade escrever nada nele. Corresponde a
   * `check_in.realizado_em` no esquema.
   */
  readonly checkInEm: Date | null;
}

/** A pessoa já passou pela portaria. */
export function compareceu(inscricao: Inscricao): boolean {
  return inscricao.checkInEm !== null;
}

/**
 * Status do ingresso agora. "Utilizado" é consequência de existir check-in,
 * não do relógio: um ingresso lido na portaria está usado no segundo
 * seguinte, e um que nunca foi lido continua emitido mesmo depois do evento.
 */
export function statusDaInscricao(inscricao: Inscricao): StatusIngresso {
  if (inscricao.cancelada) return 'cancelado';
  if (inscricao.checkInEm !== null) return 'utilizado';
  return 'emitido';
}

export function nomeCompleto(inscricao: Inscricao): string {
  return `${inscricao.participanteNome} ${inscricao.participanteSobrenome}`.trim();
}

export interface ResumoDeParticipacao {
  /** Inscrições não canceladas. */
  readonly inscritos: number;
  readonly cancelados: number;
  readonly presentes: number;
  /** Inscritos ativos que ainda não passaram pela portaria. */
  readonly ausentes: number;
  /** Presentes ÷ inscritos, 0–100. */
  readonly taxaDePresenca: number;
  readonly pedidos: number;
  readonly receitaCentavos: number;
}

/** Agrega um conjunto de inscrições. Puro: não consulta relógio nem banco. */
export function resumirParticipacao(inscricoes: readonly Inscricao[]): ResumoDeParticipacao {
  const ativos = inscricoes.filter((i) => !i.cancelada);
  const presentes = ativos.filter(compareceu).length;

  return {
    inscritos: ativos.length,
    cancelados: inscricoes.length - ativos.length,
    presentes,
    ausentes: ativos.length - presentes,
    taxaDePresenca: ativos.length === 0 ? 0 : Math.round((presentes / ativos.length) * 100),
    pedidos: new Set(ativos.map((i) => i.pedidoId)).size,
    receitaCentavos: ativos.reduce((total, i) => total + i.precoPagoCentavos, 0),
  };
}
