import type { DadosProfissionais, Ingresso } from '../domain/ingresso';

export interface DadosDeEmissao {
  readonly itemPedidoId: string;
  readonly eventoId: string;
  readonly participanteNome: string;
  readonly participanteSobrenome: string;
  readonly participanteCpf: string;
  readonly participanteEmail: string;
  readonly participanteCelular: string;
  readonly participanteNomeCracha: string;
  readonly dadosProfissionais: DadosProfissionais | null;
  readonly comoConheceu: string | null;
}

/**
 * Port do repositório de ingressos. A implementação atual é MongoDB
 * (`infrastructure/mongo-ingressos.ts`); domínio e aplicação não dependem dela.
 */
export interface IngressosRepository {
  emitir(dados: DadosDeEmissao): Promise<Ingresso>;

  listarPorItensDePedido(itemPedidoIds: readonly string[]): Promise<readonly Ingresso[]>;
}
