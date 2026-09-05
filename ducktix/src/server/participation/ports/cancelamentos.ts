import type { CancelamentoDeInscricao, StatusDeCancelamento } from '../domain/cancelamento';

export interface CancelamentosRepository {
  buscarContextoDoIngresso(ingressoId: string): Promise<{
    readonly inscricaoId: string;
    readonly pedidoId: string;
    readonly compradorId: string;
    readonly ingressoStatus: string;
    readonly checkInEm: Date | null;
  } | null>;
  buscarPorIngresso(ingressoId: string): Promise<CancelamentoDeInscricao | null>;
  buscarPorInscricao(inscricaoId: string): Promise<CancelamentoDeInscricao | null>;
  solicitar(inscricaoId: string, motivo: string | null): Promise<CancelamentoDeInscricao>;
  listarSolicitadosDoEvento(eventoId: string): Promise<readonly CancelamentoDeInscricao[]>;
  resolver(
    cancelamentoId: string,
    eventoId: string,
    status: Extract<StatusDeCancelamento, 'aprovado' | 'negado'>,
  ): Promise<CancelamentoDeInscricao | null>;
}
