import type { Inscricao } from '../domain/inscricao';

/** Uma página de inscrições — a lista de participantes de um evento grande
 *  passa de mil linhas, então a paginação é do repositório, não da tela. */
export interface PaginaDeInscricoes {
  readonly itens: readonly Inscricao[];
  readonly total: number;
}

export interface FiltroDeInscricoes {
  /** Busca por nome, e-mail ou código do ingresso. */
  readonly busca?: string;
  readonly apenasPresentes?: boolean;
  readonly apenasAusentes?: boolean;
  readonly incluirCanceladas?: boolean;
  readonly pagina?: number;
  readonly porPagina?: number;
}

/**
 * Port das inscrições (a associativa participante × evento) e do check-in.
 *
 * A implementação atual deriva a lista da fixture em memória; trocá-la pelo
 * repositório Drizzle não altera domínio nem aplicação. É por isso que
 * `registrarCheckIn` devolve a inscrição já atualizada em vez de `void`: no
 * Postgres ele vira um INSERT em `check_in` com `UNIQUE (ingresso_id)`
 * decidindo a corrida entre duas leitoras, e a linha devolvida é a que
 * venceu.
 */
export interface InscricoesRepository {
  listarPorEvento(eventoId: string, filtro?: FiltroDeInscricoes): Promise<PaginaDeInscricoes>;

  /** Todas as inscrições do evento, sem paginar — para agregar números. */
  todasDoEvento(eventoId: string): Promise<readonly Inscricao[]>;

  /** Procura pelo código do ingresso (o conteúdo do QR), em qualquer evento. */
  buscarPorCodigo(codigo: string): Promise<Inscricao | null>;

  /**
   * Grava a entrada. Devolve `null` se a inscrição não existe mais ou se
   * outra leitora registrou o check-in primeiro — a decisão de quem ganhou
   * é do repositório, não de quem chamou.
   */
  registrarCheckIn(inscricaoId: string, momento: Date): Promise<Inscricao | null>;

  /** Desfaz uma entrada registrada por engano. */
  desfazerCheckIn(inscricaoId: string): Promise<Inscricao | null>;

  /** Os últimos check-ins do evento, do mais recente para o mais antigo. */
  ultimosCheckIns(eventoId: string, limite: number): Promise<readonly Inscricao[]>;
}
