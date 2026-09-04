import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { tokenRedefinicaoSenha, usuario } from '@/server/db/schema';
import type { Papel, TokenDeRedefinicao, Usuario } from '../domain/usuario';
import type { UsuariosRepository } from '../ports/usuarios';

const VALIDADE_DO_TOKEN_MS = 60 * 60 * 1000; // 1 hora

function paraUsuario(linha: typeof usuario.$inferSelect): Usuario {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    papel: linha.papel as Papel,
    senhaHash: linha.senhaHash,
    criadoEm: linha.criadoEm,
    cpfCnpj: linha.cpfCnpj,
    fotoUrl: linha.fotoUrl,
  };
}

function paraToken(linha: typeof tokenRedefinicaoSenha.$inferSelect): TokenDeRedefinicao {
  return {
    token: linha.token,
    usuarioId: linha.usuarioId,
    expiraEm: linha.expiraEm,
  };
}

/**
 * Repositório Drizzle de identidade. Implementa o mesmo port que
 * `memoria-usuarios.ts` — trocar a exportação usada pelas Server Actions é a
 * única mudança necessária para migrar, ver docs/backend/manifesto.md.
 */
class DrizzleUsuariosRepository implements UsuariosRepository {
  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const [linha] = await db.select().from(usuario).where(eq(usuario.email, email)).limit(1);
    return linha ? paraUsuario(linha) : null;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const [linha] = await db.select().from(usuario).where(eq(usuario.id, id)).limit(1);
    return linha ? paraUsuario(linha) : null;
  }

  async criar(dados: {
    nome: string;
    email: string;
    papel: Papel;
    senhaHash: string;
  }): Promise<Usuario> {
    const [linha] = await db
      .insert(usuario)
      .values({
        nome: dados.nome,
        email: dados.email,
        papel: dados.papel,
        senhaHash: dados.senhaHash,
      })
      .returning();
    return paraUsuario(linha);
  }

  async atualizarSenha(usuarioId: string, senhaHash: string): Promise<void> {
    await db.update(usuario).set({ senhaHash }).where(eq(usuario.id, usuarioId));
  }

  async atualizarNome(usuarioId: string, nome: string): Promise<Usuario> {
    const [linha] = await db.update(usuario).set({ nome }).where(eq(usuario.id, usuarioId)).returning();
    if (!linha) throw new Error('Usuário não encontrado.');
    return paraUsuario(linha);
  }

  async atualizarEmail(usuarioId: string, email: string): Promise<Usuario> {
    const [linha] = await db.update(usuario).set({ email }).where(eq(usuario.id, usuarioId)).returning();
    if (!linha) throw new Error('Usuário não encontrado.');
    return paraUsuario(linha);
  }

  async atualizarCpfCnpj(usuarioId: string, cpfCnpj: string): Promise<Usuario> {
    const [linha] = await db
      .update(usuario)
      .set({ cpfCnpj })
      .where(eq(usuario.id, usuarioId))
      .returning();
    if (!linha) throw new Error('Usuário não encontrado.');
    return paraUsuario(linha);
  }

  async atualizarFoto(usuarioId: string, fotoUrl: string): Promise<Usuario> {
    const [linha] = await db
      .update(usuario)
      .set({ fotoUrl })
      .where(eq(usuario.id, usuarioId))
      .returning();
    if (!linha) throw new Error('Usuário não encontrado.');
    return paraUsuario(linha);
  }

  async criarTokenDeRedefinicao(usuarioId: string): Promise<TokenDeRedefinicao> {
    const [linha] = await db
      .insert(tokenRedefinicaoSenha)
      .values({
        token: randomBytes(24).toString('base64url'),
        usuarioId,
        expiraEm: new Date(Date.now() + VALIDADE_DO_TOKEN_MS),
      })
      .returning();
    return paraToken(linha);
  }

  async buscarTokenDeRedefinicao(token: string): Promise<TokenDeRedefinicao | null> {
    const [linha] = await db
      .select()
      .from(tokenRedefinicaoSenha)
      .where(eq(tokenRedefinicaoSenha.token, token))
      .limit(1);
    return linha ? paraToken(linha) : null;
  }

  async invalidarTokenDeRedefinicao(token: string): Promise<void> {
    await db.delete(tokenRedefinicaoSenha).where(eq(tokenRedefinicaoSenha.token, token));
  }
}

export const drizzleUsuariosRepository: UsuariosRepository = new DrizzleUsuariosRepository();
