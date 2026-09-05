export type StatusDeCancelamento = 'solicitado' | 'aprovado' | 'negado';

export interface CancelamentoDeInscricao {
  readonly id: string;
  readonly inscricaoId: string;
  readonly eventoId: string;
  readonly pedidoId: string;
  readonly participanteNome: string;
  readonly participanteEmail: string;
  readonly motivo: string | null;
  readonly status: StatusDeCancelamento;
  readonly solicitadoEm: Date;
  readonly resolvidoEm: Date | null;
}
