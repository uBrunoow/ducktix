/** Erros de domínio de identidade — distintos de erros de infraestrutura. */

export class EmailJaCadastradoError extends Error {
  constructor(email: string) {
    super(`Já existe uma conta com o e-mail ${email}.`);
    this.name = 'EmailJaCadastradoError';
  }
}

export class CredenciaisInvalidasError extends Error {
  constructor() {
    super('E-mail ou senha incorretos.');
    this.name = 'CredenciaisInvalidasError';
  }
}

export class TokenDeRedefinicaoInvalidoError extends Error {
  constructor() {
    super('Este link de redefinição não é válido ou já expirou.');
    this.name = 'TokenDeRedefinicaoInvalidoError';
  }
}

export class DadosDeEntradaInvalidosError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'DadosDeEntradaInvalidosError';
  }
}
