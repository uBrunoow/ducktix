/** Erros de domínio de ticketing — distintos de erros de infraestrutura. */

export class PedidoNaoEncontradoError extends Error {
  constructor() {
    super('Este pedido não existe.');
    this.name = 'PedidoNaoEncontradoError';
  }
}

export class PedidoNaoPertenceAoUsuarioError extends Error {
  constructor() {
    super('Este pedido não pertence a você.');
    this.name = 'PedidoNaoPertenceAoUsuarioError';
  }
}

export class PedidoJaFinalizadoError extends Error {
  constructor() {
    super('Este pedido já foi confirmado ou cancelado.');
    this.name = 'PedidoJaFinalizadoError';
  }
}

export class DadosDeParticipanteInvalidosError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'DadosDeParticipanteInvalidosError';
  }
}

export class CupomInvalidoError extends Error {
  constructor() {
    super('Este cupom não existe, expirou ou atingiu o limite de uso.');
    this.name = 'CupomInvalidoError';
  }
}

export class PedidoExpiradoError extends Error {
  constructor() {
    super('O tempo para finalizar este pedido expirou — volte ao evento e escolha o ingresso de novo.');
    this.name = 'PedidoExpiradoError';
  }
}

export class DadosDeCobrancaInvalidosError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'DadosDeCobrancaInvalidosError';
  }
}

export class ParticipantesAindaNaoPreenchidosError extends Error {
  constructor() {
    super('Preencha os dados dos participantes antes de ir para o pagamento.');
    this.name = 'ParticipantesAindaNaoPreenchidosError';
  }
}
