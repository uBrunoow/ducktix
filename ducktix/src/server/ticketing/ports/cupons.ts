import type { Cupom, TipoDesconto, UsoDeCupom } from '../domain/cupom';

export interface DadosDeNovoCupom {
  readonly codigo: string;
  readonly tipoDesconto: TipoDesconto;
  readonly valor: number;
  readonly validoDe: Date;
  readonly validoAte: Date;
  readonly limiteDeUso: number;
  readonly eventosIds: readonly string[];
}

export interface DadosDeUsoDeCupom {
  readonly cupomId: string;
  readonly pedidoId: string;
  readonly eventoId: string;
  readonly descontoCentavos: number;
}

/**
 * Port do repositório de cupons. A implementação atual é MongoDB
 * (`infrastructure/mongo-cupons.ts`); domínio e aplicação não dependem dela.
 */
export interface CupomRepository {
  buscarPorCodigo(codigo: string): Promise<Cupom | null>;
  buscarPorCodigoNoEvento(codigo: string, eventoId: string): Promise<Cupom | null>;
  buscarPorId(cupomId: string): Promise<Cupom | null>;
  listarTodos(): Promise<readonly Cupom[]>;

  criar(dados: DadosDeNovoCupom): Promise<Cupom>;
  definirAtivo(cupomId: string, ativo: boolean): Promise<void>;

  /**
   * Registra o uso e incrementa o contador na mesma operação — os dois
   * sempre andam juntos, e separá-los deixaria `usos` divergir da lista de
   * usos (no MongoDB, um único `updateOne` com `$push` + `$inc`).
   */
  registrarUso(dados: DadosDeUsoDeCupom): Promise<void>;

  listarUsos(cupomId: string): Promise<readonly UsoDeCupom[]>;
  listarUsosPorEvento(eventoId: string): Promise<readonly UsoDeCupom[]>;
}
