/**
 * Domínio de participação: o ingresso emitido. Sem dependência de Postgres,
 * HTTP ou React — ver docs/guidelines.md, "Camadas".
 */

export type StatusIngresso = 'emitido' | 'cancelado' | 'utilizado';

/** Tudo opcional — "dados profissionais" é enriquecimento de perfil, não
 *  requisito para emitir o ingresso. */
export interface DadosProfissionais {
  readonly linkedin: string;
  readonly github: string;
  readonly empresa: string;
  readonly segmento: string;
  readonly cargo: string;
  readonly nivel: string;
}

export interface Ingresso {
  readonly id: string;
  /** Item de pedido (em ticketing) que originou este ingresso. */
  readonly itemPedidoId: string;
  readonly eventoId: string;
  /** Quem vai usar o ingresso — não precisa ser quem comprou. */
  readonly participanteNome: string;
  readonly participanteSobrenome: string;
  readonly participanteEmail: string;
  readonly participanteCelular: string;
  /** Nome pro crachá — se vazio, exibição cai para nome + sobrenome. */
  readonly participanteNomeCracha: string;
  readonly dadosProfissionais: DadosProfissionais | null;
  readonly comoConheceu: string | null;
  readonly status: StatusIngresso;
  readonly emitidoEm: Date;
}

export function nomeDeExibicao(ingresso: Pick<Ingresso, 'participanteNome' | 'participanteSobrenome' | 'participanteNomeCracha'>): string {
  return ingresso.participanteNomeCracha.trim() || `${ingresso.participanteNome} ${ingresso.participanteSobrenome}`.trim();
}

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
