/**
 * Domínio de identidade. Sem dependência de Postgres, cookies, HTTP ou React
 * — ver docs/guidelines.md, "Camadas".
 */

export type Papel = 'participante' | 'organizador';

export interface Usuario {
  readonly id: string;
  readonly nome: string;
  readonly email: string;
  readonly papel: Papel;
  readonly senhaHash: string;
  readonly criadoEm: Date;
  /** CPF (participante) ou CNPJ (organizador), só dígitos. `null` até o usuário informar. */
  readonly cpfCnpj: string | null;
  /** Foto de perfil como data URL — sem storage de arquivos nesta fase. */
  readonly fotoUrl: string | null;
}

export interface TokenDeRedefinicao {
  readonly token: string;
  readonly usuarioId: string;
  readonly expiraEm: Date;
}

export function rotuloPapel(papel: Papel): string {
  return papel === 'organizador' ? 'Organizador' : 'Participante';
}

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function senhaForteOsuficiente(senha: string): boolean {
  return senha.length >= 8;
}

export function tokenExpirado(token: TokenDeRedefinicao, agora: Date): boolean {
  return agora > token.expiraEm;
}

/** Só formato (11 dígitos = CPF, 14 = CNPJ) — sem dígito verificador, fora de
 *  escopo desta fase. */
export function cpfOuCnpjValido(valor: string): boolean {
  const digitos = valor.replace(/\D/g, '');
  return digitos.length === 11 || digitos.length === 14;
}
