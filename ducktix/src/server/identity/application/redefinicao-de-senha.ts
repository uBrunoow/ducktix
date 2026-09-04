import { TokenDeRedefinicaoInvalidoError } from '../domain/erros';
import { hashDaSenha } from '../domain/senha';
import { senhaForteOsuficiente, tokenExpirado } from '../domain/usuario';
import { DadosDeEntradaInvalidosError } from '../domain/erros';
import type { TokenDeRedefinicao } from '../domain/usuario';
import type { UsuariosRepository } from '../ports/usuarios';

/**
 * Emite um token de redefinição para o e-mail informado. Não revela se o
 * e-mail existe — quem pergunta sempre recebe a mesma resposta de sucesso;
 * só quando a conta existe é que um token de verdade é criado.
 *
 * Sem serviço de e-mail configurado nesta fase acadêmica (ver PRODUCT.md,
 * "Evidence on Hand"), o token não é enviado — é devolvido para a camada de
 * apresentação exibir como link de teste, rotulado como tal.
 */
export async function solicitarRedefinicaoDeSenha(
  repo: UsuariosRepository,
  email: string,
): Promise<TokenDeRedefinicao | null> {
  const usuario = await repo.buscarPorEmail(email.trim().toLowerCase());
  if (!usuario) return null;
  return repo.criarTokenDeRedefinicao(usuario.id);
}

export async function redefinirSenha(
  repo: UsuariosRepository,
  token: string,
  novaSenha: string,
  agora: Date,
): Promise<void> {
  const registro = await repo.buscarTokenDeRedefinicao(token);
  if (!registro || tokenExpirado(registro, agora)) {
    throw new TokenDeRedefinicaoInvalidoError();
  }
  if (!senhaForteOsuficiente(novaSenha)) {
    throw new DadosDeEntradaInvalidosError('A senha precisa ter ao menos 8 caracteres.');
  }

  await repo.atualizarSenha(registro.usuarioId, hashDaSenha(novaSenha));
  await repo.invalidarTokenDeRedefinicao(token);
}
