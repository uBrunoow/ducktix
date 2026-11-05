import { randomBytes, randomUUID } from 'node:crypto';
import { colecoes, type TokenRedefinicaoSenhaDoc, type UsuarioDoc } from '@/server/db/colecoes';
import type { Papel, TokenDeRedefinicao, Usuario } from '../domain/usuario';
import type { UsuariosRepository } from '../ports/usuarios';

const VALIDADE_DO_TOKEN_MS = 60 * 60 * 1000; // 1 hora

function paraUsuario(doc: UsuarioDoc): Usuario {
  return {
    id: doc._id,
    nome: doc.nome,
    email: doc.email,
    papel: doc.papel as Papel,
    senhaHash: doc.senhaHash,
    criadoEm: doc.criadoEm,
    cpfCnpj: doc.cpfCnpj,
    fotoUrl: doc.fotoUrl,
  };
}

function paraToken(doc: TokenRedefinicaoSenhaDoc): TokenDeRedefinicao {
  return { token: doc._id, usuarioId: doc.usuarioId, expiraEm: doc.expiraEm };
}

/**
 * Repositório MongoDB de identidade (collections `usuarios` e
 * `tokensRedefinicaoSenha`). Implementa o mesmo port do antigo repositório
 * Drizzle — domínio e aplicação não mudaram na migração.
 */
class MongoUsuariosRepository implements UsuariosRepository {
  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const doc = await colecoes.usuarios().findOne({ email });
    return doc ? paraUsuario(doc) : null;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const doc = await colecoes.usuarios().findOne({ _id: id });
    return doc ? paraUsuario(doc) : null;
  }

  async criar(dados: {
    nome: string;
    email: string;
    papel: Papel;
    senhaHash: string;
  }): Promise<Usuario> {
    const doc: UsuarioDoc = {
      _id: randomUUID(),
      nome: dados.nome,
      email: dados.email,
      papel: dados.papel,
      senhaHash: dados.senhaHash,
      cpfCnpj: null,
      fotoUrl: null,
      criadoEm: new Date(),
      organizador: null,
    };
    // O índice único `uk_usuarios_email` faz o papel do UNIQUE do Postgres.
    await colecoes.usuarios().insertOne(doc);
    return paraUsuario(doc);
  }

  async atualizarSenha(usuarioId: string, senhaHash: string): Promise<void> {
    await colecoes.usuarios().updateOne({ _id: usuarioId }, { $set: { senhaHash } });
  }

  private async atualizar(usuarioId: string, campos: Partial<UsuarioDoc>): Promise<Usuario> {
    const doc = await colecoes
      .usuarios()
      .findOneAndUpdate({ _id: usuarioId }, { $set: campos }, { returnDocument: 'after' });
    if (!doc) throw new Error('Usuário não encontrado.');
    return paraUsuario(doc);
  }

  atualizarNome(usuarioId: string, nome: string): Promise<Usuario> {
    return this.atualizar(usuarioId, { nome });
  }

  atualizarEmail(usuarioId: string, email: string): Promise<Usuario> {
    return this.atualizar(usuarioId, { email });
  }

  atualizarCpfCnpj(usuarioId: string, cpfCnpj: string): Promise<Usuario> {
    return this.atualizar(usuarioId, { cpfCnpj });
  }

  atualizarFoto(usuarioId: string, fotoUrl: string): Promise<Usuario> {
    return this.atualizar(usuarioId, { fotoUrl });
  }

  async criarTokenDeRedefinicao(usuarioId: string): Promise<TokenDeRedefinicao> {
    const doc: TokenRedefinicaoSenhaDoc = {
      _id: randomBytes(24).toString('base64url'),
      usuarioId,
      expiraEm: new Date(Date.now() + VALIDADE_DO_TOKEN_MS),
    };
    await colecoes.tokensRedefinicaoSenha().insertOne(doc);
    return paraToken(doc);
  }

  async buscarTokenDeRedefinicao(token: string): Promise<TokenDeRedefinicao | null> {
    const doc = await colecoes.tokensRedefinicaoSenha().findOne({ _id: token });
    return doc ? paraToken(doc) : null;
  }

  async invalidarTokenDeRedefinicao(token: string): Promise<void> {
    await colecoes.tokensRedefinicaoSenha().deleteOne({ _id: token });
  }
}

export const mongoUsuariosRepository: UsuariosRepository = new MongoUsuariosRepository();
