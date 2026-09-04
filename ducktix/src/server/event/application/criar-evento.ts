import {
  DadosDeEventoInvalidosError,
  EventoNaoEncontradoError,
} from '../domain/erros';
import {
  ingressosVendidos,
  type Evento,
  type FormatoOnline,
  type Modalidade,
  type Visibilidade,
} from '../domain/evento';
import type {
  CatalogoPublicoRepository,
  DadosDeNovoLote,
} from '../ports/catalogo-publico';

export interface DadosDeCriacaoDeEvento {
  readonly nome: string;
  readonly organizador: string;
  readonly organizadorUsuarioId: string;
  readonly categoria: string;
  readonly modalidade: Modalidade;
  readonly formatoOnline: FormatoOnline | null;
  readonly local: string | null;
  readonly comecaEm: Date;
  readonly terminaEm: Date;
  readonly descricao: string;
  readonly imagemUrl: string | null;
  readonly visibilidade: Visibilidade;
  readonly aceiteTermos: boolean;
  readonly lotes: readonly DadosDeNovoLote[];
  /** Publica o evento imediatamente após criar, em vez de deixar como rascunho. */
  readonly publicarAgora: boolean;
}

/**
 * Cria um evento novo — sempre como `rascunho` primeiro — e, se
 * `publicarAgora`, já o publica na sequência. Validação de negócio mínima:
 * o que a UI já impede via zod não precisa ser reafirmado aqui, mas as
 * invariantes que protegem o catálogo (local obrigatório fora de online,
 * término depois do início, ao menos um lote) são do domínio, não da borda.
 */
export async function criarEvento(
  catalogo: CatalogoPublicoRepository,
  dados: DadosDeCriacaoDeEvento,
): Promise<Evento> {
  if (dados.nome.trim().length < 3) {
    throw new DadosDeEventoInvalidosError('Informe um nome para o evento.');
  }
  if (dados.modalidade !== 'online' && !dados.local) {
    throw new DadosDeEventoInvalidosError(
      'Eventos presenciais ou híbridos precisam de um local.',
    );
  }
  if (dados.terminaEm <= dados.comecaEm) {
    throw new DadosDeEventoInvalidosError(
      'A data de término precisa ser depois da data de início.',
    );
  }
  if (dados.lotes.length === 0) {
    throw new DadosDeEventoInvalidosError(
      'Adicione ao menos um lote de ingresso.',
    );
  }
  for (const lote of dados.lotes) {
    if (lote.vagas < 1) {
      throw new DadosDeEventoInvalidosError(
        `O lote "${lote.nome}" precisa de ao menos 1 vaga.`,
      );
    }
    if (lote.iniciaEm && lote.encerraEm && lote.encerraEm <= lote.iniciaEm) {
      throw new DadosDeEventoInvalidosError(
        `O lote "${lote.nome}" precisa encerrar depois de começar.`,
      );
    }
    // Um lote que só abre depois do evento acontecer nunca vende nada — é
    // erro de digitação, não uma configuração possível.
    if (lote.iniciaEm && lote.iniciaEm >= dados.comecaEm) {
      throw new DadosDeEventoInvalidosError(
        `A venda do lote "${lote.nome}" precisa abrir antes do evento começar.`,
      );
    }
  }
  if (!dados.aceiteTermos) {
    throw new DadosDeEventoInvalidosError(
      'É preciso aceitar os termos de uso e a política da Ducktix para publicar um evento.',
    );
  }

  const evento = await catalogo.criar({
    nome: dados.nome.trim(),
    organizador: dados.organizador.trim(),
    organizadorUsuarioId: dados.organizadorUsuarioId,
    categoria: dados.categoria,
    modalidade: dados.modalidade,
    formatoOnline:
      dados.modalidade === 'presencial' ? null : dados.formatoOnline,
    local: dados.modalidade === 'online' ? null : dados.local,
    comecaEm: dados.comecaEm,
    terminaEm: dados.terminaEm,
    descricao: dados.descricao.trim(),
    imagemUrl: dados.imagemUrl,
    visibilidade: dados.visibilidade,
    lotes: dados.lotes,
  });

  if (dados.publicarAgora) {
    await catalogo.publicar(evento.id);
    return { ...evento, status: 'publicado' };
  }

  return evento;
}

export async function publicarEvento(
  catalogo: CatalogoPublicoRepository,
  eventoId: string,
): Promise<void> {
  const evento = await catalogo.buscarPorId(eventoId);
  if (!evento) throw new DadosDeEventoInvalidosError('Este evento não existe.');
  await catalogo.publicar(eventoId);
}

/** Tira o evento da vitrine sem perder nada — volta a `rascunho`, o mesmo
 *  estado de antes de publicar. Só faz sentido para um evento publicado. */
export async function despublicarEvento(
  catalogo: CatalogoPublicoRepository,
  eventoId: string,
): Promise<void> {
  const evento = await catalogo.buscarPorId(eventoId);
  if (!evento) throw new EventoNaoEncontradoError();
  if (evento.status !== 'publicado') {
    throw new DadosDeEventoInvalidosError(
      'Só um evento publicado pode ser despublicado.',
    );
  }
  await catalogo.despublicar(eventoId);
}

/**
 * Cancela o evento — estado final e distinto de excluir: pedidos, ingressos
 * e o histórico continuam existindo, só a realização do evento é que não
 * vale mais. Quem já comprou ingresso ainda precisa conseguir ver o pedido.
 */
export async function cancelarEvento(
  catalogo: CatalogoPublicoRepository,
  eventoId: string,
): Promise<void> {
  const evento = await catalogo.buscarPorId(eventoId);
  if (!evento) throw new EventoNaoEncontradoError();
  if (evento.status === 'cancelado') {
    throw new DadosDeEventoInvalidosError('Este evento já está cancelado.');
  }
  await catalogo.cancelar(eventoId);
}

/**
 * Exclui o evento do catálogo — irreversível, e por isso só permitido sem
 * nenhum ingresso vendido. Com venda registrada o processo correto é
 * cancelar: excluir apagaria o rastro de um pedido que já existe.
 */
export async function excluirEvento(
  catalogo: CatalogoPublicoRepository,
  eventoId: string,
): Promise<void> {
  const evento = await catalogo.buscarPorId(eventoId);
  if (!evento) throw new EventoNaoEncontradoError();
  if (ingressosVendidos(evento) > 0) {
    throw new DadosDeEventoInvalidosError(
      'Este evento já tem ingresso vendido — cancele em vez de excluir.',
    );
  }
  await catalogo.excluir(eventoId);
}

export interface DadosDeAtualizacaoDeEvento {
  readonly nome: string;
  readonly categoria: string;
  readonly modalidade: Modalidade;
  readonly formatoOnline: FormatoOnline | null;
  readonly local: string | null;
  readonly comecaEm: Date;
  readonly terminaEm: Date;
  readonly descricao: string;
  readonly imagemUrl: string | null;
  readonly visibilidade: Visibilidade;
}

/**
 * Edita um evento existente. As mesmas invariantes de `criarEvento` valem
 * aqui — um evento não deixa de precisar de local ou de ordem cronológica só
 * porque já existe. Capacidade e preço não entram: são propriedades dos
 * lotes, e alterá-las com ingresso vendido é outro processo de negócio.
 */
export async function atualizarEvento(
  catalogo: CatalogoPublicoRepository,
  eventoId: string,
  dados: DadosDeAtualizacaoDeEvento,
): Promise<Evento> {
  const existente = await catalogo.buscarPorId(eventoId);
  if (!existente) throw new EventoNaoEncontradoError();

  if (dados.nome.trim().length < 3) {
    throw new DadosDeEventoInvalidosError('Informe um nome para o evento.');
  }
  if (dados.modalidade !== 'online' && !dados.local) {
    throw new DadosDeEventoInvalidosError(
      'Eventos presenciais ou híbridos precisam de um local.',
    );
  }
  if (dados.terminaEm <= dados.comecaEm) {
    throw new DadosDeEventoInvalidosError(
      'A data de término precisa ser depois da data de início.',
    );
  }

  return catalogo.atualizar(eventoId, {
    nome: dados.nome.trim(),
    categoria: dados.categoria,
    modalidade: dados.modalidade,
    formatoOnline:
      dados.modalidade === 'presencial' ? null : dados.formatoOnline,
    local: dados.modalidade === 'online' ? null : dados.local,
    comecaEm: dados.comecaEm,
    terminaEm: dados.terminaEm,
    descricao: dados.descricao.trim(),
    imagemUrl: dados.imagemUrl,
    visibilidade: dados.visibilidade,
  });
}
