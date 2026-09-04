import { DadosDeEntradaInvalidosError, EmailJaCadastradoError } from '../domain/erros';
import { hashDaSenha } from '../domain/senha';
import { type Papel, type Usuario, emailValido, senhaForteOsuficiente } from '../domain/usuario';
import type { UsuariosRepository } from '../ports/usuarios';

export interface DadosDeRegistro {
  readonly nome: string;
  readonly email: string;
  readonly senha: string;
  readonly papel: Papel;
}

export async function registrarUsuario(
  repo: UsuariosRepository,
  dados: DadosDeRegistro,
): Promise<Usuario> {
  const nome = dados.nome.trim();
  const email = dados.email.trim().toLowerCase();

  if (nome.length < 2) {
    throw new DadosDeEntradaInvalidosError('Informe seu nome.');
  }
  if (!emailValido(email)) {
    throw new DadosDeEntradaInvalidosError('Informe um e-mail válido.');
  }
  if (!senhaForteOsuficiente(dados.senha)) {
    throw new DadosDeEntradaInvalidosError('A senha precisa ter ao menos 8 caracteres.');
  }

  const existente = await repo.buscarPorEmail(email);
  if (existente) throw new EmailJaCadastradoError(email);

  return repo.criar({
    nome,
    email,
    papel: dados.papel,
    senhaHash: hashDaSenha(dados.senha),
  });
}
