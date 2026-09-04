/** Erros de domínio de evento — distintos de erros de infraestrutura. */

export class DadosDeEventoInvalidosError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'DadosDeEventoInvalidosError';
  }
}

export class EventoNaoEncontradoError extends Error {
  constructor() {
    super('Este evento não existe.');
    this.name = 'EventoNaoEncontradoError';
  }
}
