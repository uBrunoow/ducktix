import { CredenciaisInvalidasError } from '../domain/erros';
import { senhaConfere } from '../domain/senha';
import type { Usuario } from '../domain/usuario';
import type { UsuariosRepository } from '../ports/usuarios';

export async function autenticar(
  repo: UsuariosRepository,
  email: string,
  senha: string,
): Promise<Usuario> {
  const usuario = await repo.buscarPorEmail(email.trim().toLowerCase());
  // Mesma mensagem para e-mail inexistente ou senha errada: a distinção não
  // é assunto do domínio de negócio, é enumeração de contas — fora de escopo
  // desta fase, mas a mensagem única não custa nada e evita o hábito ruim.
  if (!usuario || !senhaConfere(senha, usuario.senhaHash)) {
    throw new CredenciaisInvalidasError();
  }
  return usuario;
}
