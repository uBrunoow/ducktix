import { DadosDeEntradaInvalidosError, EmailJaCadastradoError } from '../domain/erros';
import { cpfOuCnpjValido, emailValido, type Usuario } from '../domain/usuario';
import type { UsuariosRepository } from '../ports/usuarios';

export async function atualizarNome(
  repo: UsuariosRepository,
  usuarioId: string,
  novoNome: string,
): Promise<Usuario> {
  const nome = novoNome.trim();
  if (nome.length < 2) {
    throw new DadosDeEntradaInvalidosError('Informe seu nome.');
  }
  return repo.atualizarNome(usuarioId, nome);
}

export async function atualizarEmail(
  repo: UsuariosRepository,
  usuarioId: string,
  novoEmail: string,
): Promise<Usuario> {
  const email = novoEmail.trim().toLowerCase();
  if (!emailValido(email)) {
    throw new DadosDeEntradaInvalidosError('Informe um e-mail válido.');
  }
  const existente = await repo.buscarPorEmail(email);
  if (existente && existente.id !== usuarioId) {
    throw new EmailJaCadastradoError(email);
  }
  return repo.atualizarEmail(usuarioId, email);
}

export async function atualizarCpfCnpj(
  repo: UsuariosRepository,
  usuarioId: string,
  novoValor: string,
): Promise<Usuario> {
  const valor = novoValor.trim();
  if (!cpfOuCnpjValido(valor)) {
    throw new DadosDeEntradaInvalidosError('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
  }
  return repo.atualizarCpfCnpj(usuarioId, valor.replace(/\D/g, ''));
}

export async function atualizarFoto(
  repo: UsuariosRepository,
  usuarioId: string,
  fotoUrl: string,
): Promise<Usuario> {
  if (!fotoUrl.startsWith('https://')) {
    throw new DadosDeEntradaInvalidosError('Envie uma imagem válida.');
  }
  return repo.atualizarFoto(usuarioId, fotoUrl);
}
