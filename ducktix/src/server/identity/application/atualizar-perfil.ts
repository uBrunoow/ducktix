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

const TAMANHO_MAXIMO_DA_FOTO = 1_500_000; // ~1.1MB decodificado de base64

export async function atualizarFoto(
  repo: UsuariosRepository,
  usuarioId: string,
  fotoDataUrl: string,
): Promise<Usuario> {
  if (!fotoDataUrl.startsWith('data:image/')) {
    throw new DadosDeEntradaInvalidosError('Envie um arquivo de imagem válido.');
  }
  if (fotoDataUrl.length > TAMANHO_MAXIMO_DA_FOTO) {
    throw new DadosDeEntradaInvalidosError('A imagem é grande demais (máximo ~1MB).');
  }
  return repo.atualizarFoto(usuarioId, fotoDataUrl);
}
