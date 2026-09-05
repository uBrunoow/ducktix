/**
 * Domínio de cupom. Sem dependência de Postgres, HTTP ou React — ver
 * docs/guidelines.md, "Camadas".
 */

export type TipoDesconto = 'percentual' | 'fixo';

export interface Cupom {
  readonly id: string;
  readonly codigo: string;
  readonly tipoDesconto: TipoDesconto;
  /** Percentual (0–100) quando `tipoDesconto` é 'percentual'; centavos quando é 'fixo'. */
  readonly valor: number;
  readonly validoDe: Date;
  readonly validoAte: Date;
  readonly limiteDeUso: number;
  readonly usos: number;
  /** O evento ao qual o cupom pertence. */
  readonly eventosIds: readonly string[];
  /** Desativado pelo organizador — distinto de expirado ou esgotado. */
  readonly ativo: boolean;
  readonly criadoEm: Date;
}

/**
 * Uso de um cupom num pedido concreto. É a tabela associativa
 * cupom × pedido × evento: sem ela o organizador vê quantas vezes o cupom
 * rodou, mas não em quê.
 */
export interface UsoDeCupom {
  readonly id: string;
  readonly cupomId: string;
  readonly pedidoId: string;
  readonly eventoId: string;
  readonly descontoCentavos: number;
  readonly usadoEm: Date;
}

export type StatusCupom = 'ativo' | 'agendado' | 'expirado' | 'esgotado' | 'desativado';

export function statusDoCupom(cupom: Cupom, agora: Date): StatusCupom {
  if (!cupom.ativo) return 'desativado';
  if (cupom.usos >= cupom.limiteDeUso) return 'esgotado';
  if (agora < cupom.validoDe) return 'agendado';
  if (agora > cupom.validoAte) return 'expirado';
  return 'ativo';
}

const STATUS_ROTULO: Record<StatusCupom, string> = {
  ativo: 'Ativo',
  agendado: 'Agendado',
  expirado: 'Expirado',
  esgotado: 'Esgotado',
  desativado: 'Desativado',
};

export function rotuloStatusCupom(status: StatusCupom): string {
  return STATUS_ROTULO[status];
}

export function cupomValido(cupom: Cupom, agora: Date): boolean {
  return statusDoCupom(cupom, agora) === 'ativo';
}

/** O cupom vale somente para o evento ao qual foi vinculado. */
export function cupomValeParaEvento(cupom: Cupom, eventoId: string): boolean {
  return cupom.eventosIds.includes(eventoId);
}

export function valorDoDescontoCentavos(cupom: Cupom, totalBrutoCentavos: number): number {
  if (cupom.tipoDesconto === 'percentual') {
    return Math.round((totalBrutoCentavos * cupom.valor) / 100);
  }
  return Math.min(cupom.valor, totalBrutoCentavos);
}

/** Texto curto do desconto, para tabela e selo. */
export function descricaoDoDesconto(cupom: Cupom): string {
  if (cupom.tipoDesconto === 'percentual') return `${cupom.valor}%`;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    cupom.valor / 100,
  );
}
