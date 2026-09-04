import { CredenciaisInvalidasError, DadosDeEntradaInvalidosError } from '../domain/erros';
import { hashDaSenha, senhaConfere } from '../domain/senha';
import { senhaForteOsuficiente } from '../domain/usuario';
import type { UsuariosRepository } from '../ports/usuarios';

export async function alterarSenha(
  repo: UsuariosRepository,
  usuarioId: string,
  senhaAtual: string,
  novaSenha: string,
): Promise<void> {
  const usuario = await repo.buscarPorId(usuarioId);
  if (!usuario || !senhaConfere(senhaAtual, usuario.senhaHash)) {
    throw new CredenciaisInvalidasError();
  }
  if (!senhaForteOsuficiente(novaSenha)) {
    throw new DadosDeEntradaInvalidosError('A nova senha precisa ter ao menos 8 caracteres.');
  }
  await repo.atualizarSenha(usuarioId, hashDaSenha(novaSenha));
}
