import type { Papel, TokenDeRedefinicao, Usuario } from '../domain/usuario';

/**
 * Port do repositório de identidade. A implementação atual guarda tudo em
 * memória; trocá-la pelo repositório Drizzle não altera domínio nem
 * aplicação — ver docs/backend/manifesto.md.
 */
export interface UsuariosRepository {
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarPorId(id: string): Promise<Usuario | null>;

  criar(dados: {
    nome: string;
    email: string;
    papel: Papel;
    senhaHash: string;
  }): Promise<Usuario>;

  atualizarSenha(usuarioId: string, senhaHash: string): Promise<void>;
  atualizarNome(usuarioId: string, nome: string): Promise<Usuario>;
  atualizarEmail(usuarioId: string, email: string): Promise<Usuario>;
  atualizarCpfCnpj(usuarioId: string, cpfCnpj: string): Promise<Usuario>;
  atualizarFoto(usuarioId: string, fotoUrl: string): Promise<Usuario>;

  criarTokenDeRedefinicao(usuarioId: string): Promise<TokenDeRedefinicao>;
  buscarTokenDeRedefinicao(token: string): Promise<TokenDeRedefinicao | null>;
  invalidarTokenDeRedefinicao(token: string): Promise<void>;
}
