import type {
  Evento,
  FormatoOnline,
  Modalidade,
  Visibilidade,
} from '../domain/evento';

export interface DadosDeNovoLote {
  readonly nome: string;
  readonly precoCentavos: number;
  readonly vagas: number;
  readonly iniciaEm: Date | null;
  readonly encerraEm: Date | null;
}

export interface DadosDeNovoEvento {
  readonly nome: string;
  readonly organizador: string;
  /** Sessão de quem está criando — a FK real para `organizador`. `organizador`
   *  acima continua existindo como nome de exibição (é o que a vitrine
   *  mostra), mas quem liga o evento à conta de quem o criou é este id. */
  readonly organizadorUsuarioId: string;
  readonly categoria: string;
  readonly modalidade: Modalidade;
  readonly local: string | null;
  readonly comecaEm: Date;
  readonly terminaEm: Date;
  readonly descricao: string;
  readonly imagemUrl: string | null;
  readonly visibilidade: Visibilidade;
  readonly formatoOnline: FormatoOnline | null;
  readonly lotes: readonly DadosDeNovoLote[];
}

/** Campos que a edição de um evento existente pode alterar. */
export interface DadosDeEdicaoDeEvento {
  readonly nome: string;
  readonly categoria: string;
  readonly modalidade: Modalidade;
  readonly local: string | null;
  readonly comecaEm: Date;
  readonly terminaEm: Date;
  readonly descricao: string;
  readonly imagemUrl: string | null;
  readonly visibilidade: Visibilidade;
  readonly formatoOnline: FormatoOnline | null;
}

/**
 * Port do catálogo de eventos — atende tanto a leitura pública (vitrine)
 * quanto a escrita do organizador (criar/publicar). A implementação atual
 * guarda tudo em memória; trocá-la pelo repositório Drizzle não altera
 * domínio nem aplicação.
 */
export interface CatalogoPublicoRepository {
  /** Eventos publicados que começam dentro do intervalo, em ordem cronológica. */
  listarPublicados(inicio: Date, fim: Date): Promise<readonly Evento[]>;

  /** Todo o catálogo, em qualquer status de publicação, em ordem cronológica. */
  listarTodos(): Promise<readonly Evento[]>;

  /** Um evento pelo id, ou `null` se não existir. */
  buscarPorId(eventoId: string): Promise<Evento | null>;

  /** Só os eventos deste organizador — é o que o back-office lista e
   *  seleciona, nunca o catálogo inteiro. */
  listarDoOrganizador(organizadorUsuarioId: string): Promise<readonly Evento[]>;

  /**
   * Registra `quantidade` ingressos vendidos num lote específico,
   * incrementando `vendidos`. Chamado pela aplicação de `ticketing` ao
   * confirmar um pedido — não há checagem de estoque aqui, quem decide se a
   * venda pode acontecer é `loteEstaAberto` antes de chamar isto.
   */
  registrarVenda(
    eventoId: string,
    loteId: string,
    quantidade: number,
  ): Promise<void>;

  /** Cria um evento novo, sempre com `status: 'rascunho'`. */
  criar(dados: DadosDeNovoEvento): Promise<Evento>;

  /** Move um evento de `rascunho` para `publicado`, tornando-o visível na vitrine. */
  publicar(eventoId: string): Promise<void>;

  /** Volta um evento de `publicado` para `rascunho`, tirando-o da vitrine. */
  despublicar(eventoId: string): Promise<void>;

  /** Marca o evento como `cancelado` — estado final, não removível pela publicação de novo. */
  cancelar(eventoId: string): Promise<void>;

  /** Remove o evento do catálogo. Só chamado pela aplicação quando não há ingresso vendido. */
  excluir(eventoId: string): Promise<void>;

  /**
   * Atualiza os campos editáveis de um evento. Os lotes NÃO entram aqui:
   * mexer em preço e vagas de um lote com ingresso já vendido é outro
   * processo de negócio (e outra tela), não um campo de formulário.
   */
  atualizar(eventoId: string, dados: DadosDeEdicaoDeEvento): Promise<Evento>;
}
