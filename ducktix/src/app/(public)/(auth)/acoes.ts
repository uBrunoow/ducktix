'use server';

import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  esquemaEsqueciSenha,
  esquemaLogin,
  esquemaRedefinicao,
  esquemaRegistro,
} from './schemas';
import {
  CredenciaisInvalidasError,
  DadosDeEntradaInvalidosError,
  EmailJaCadastradoError,
  TokenDeRedefinicaoInvalidoError,
} from '@/server/identity/domain/erros';
import type { Papel } from '@/server/identity/domain/usuario';
import { autenticar } from '@/server/identity/application/autenticar';
import { registrarUsuario } from '@/server/identity/application/registrar';
import {
  redefinirSenha,
  solicitarRedefinicaoDeSenha,
} from '@/server/identity/application/redefinicao-de-senha';
import { drizzleUsuariosRepository as usuariosRepository } from '@/server/identity/infrastructure/drizzle-usuarios';
import { encerrarSessao, iniciarSessao } from '@/server/identity/infrastructure/sessao';

/**
 * Resposta de uma ação de conta. `erro` é falha de fluxo (credencial errada,
 * e-mail já usado) e vira alerta; `campos` são erros por campo devolvidos pelo
 * servidor, que o formulário devolve ao react-hook-form via setError.
 */
export interface RespostaDaAcao {
  readonly erro?: string;
  readonly campos?: Readonly<Record<string, string>>;
  readonly enviado?: boolean;
  readonly linkDeTeste?: string;
}

/** Traduz o erro do zod para o formato que o formulário sabe aplicar. */
function camposDoErro(erro: z.ZodError): RespostaDaAcao {
  const campos: Record<string, string> = {};
  for (const problema of erro.issues) {
    const campo = problema.path[0];
    if (typeof campo === 'string' && !(campo in campos)) {
      campos[campo] = problema.message;
    }
  }
  return { campos };
}

function destinoPorPapel(papel: Papel): '/organizer' | '/' {
  return papel === 'organizador' ? '/organizer' : '/';
}

/**
 * `next` vem de query string — nunca confiar nele sem validar. Só aceita
 * caminho relativo de dentro do próprio site (`/algo`), nunca `//algo`
 * (protocol-relative) nem uma URL absoluta, o que evitaria um redirecionamento
 * aberto para outro domínio.
 */
function destinoSeguro(next: string | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export async function acaoLogin(dados: unknown, next?: string): Promise<RespostaDaAcao> {
  const analise = esquemaLogin.safeParse(dados);
  if (!analise.success) return camposDoErro(analise.error);

  let destino: string;
  try {
    const usuario = await autenticar(
      usuariosRepository,
      analise.data.email,
      analise.data.senha,
    );
    await iniciarSessao({ usuarioId: usuario.id, papel: usuario.papel });
    destino = destinoSeguro(next) ?? destinoPorPapel(usuario.papel);
  } catch (erro) {
    if (erro instanceof CredenciaisInvalidasError) return { erro: erro.message };
    throw erro;
  }

  redirect(destino as Route);
}

export async function acaoRegistrar(dados: unknown, next?: string): Promise<RespostaDaAcao> {
  const analise = esquemaRegistro.safeParse(dados);
  if (!analise.success) return camposDoErro(analise.error);

  let destino: string = '/';

  try {
    const usuario = await registrarUsuario(usuariosRepository, analise.data);
    await iniciarSessao({ usuarioId: usuario.id, papel: usuario.papel });
    destino = destinoSeguro(next) ?? destinoPorPapel(usuario.papel);
  } catch (erro) {
    if (erro instanceof EmailJaCadastradoError) {
      return { campos: { email: erro.message } };
    }
    if (erro instanceof DadosDeEntradaInvalidosError) return { erro: erro.message };
    throw erro;
  }

  redirect(destino as Route);
}

export async function acaoSolicitarRedefinicao(dados: unknown): Promise<RespostaDaAcao> {
  const analise = esquemaEsqueciSenha.safeParse(dados);
  if (!analise.success) return camposDoErro(analise.error);

  const registro = await solicitarRedefinicaoDeSenha(
    usuariosRepository,
    analise.data.email,
  );

  // Sucesso sempre parece o mesmo, exista ou não a conta — só o link de teste
  // (quando existe) revela a diferença, e só porque não há e-mail de verdade
  // nesta fase. Ver o comentário em redefinicao-de-senha.ts.
  return {
    enviado: true,
    linkDeTeste: registro ? `/reset-password?token=${registro.token}` : undefined,
  };
}

export async function acaoRedefinirSenha(dados: unknown): Promise<RespostaDaAcao> {
  const analise = esquemaRedefinicao.safeParse(dados);
  if (!analise.success) return camposDoErro(analise.error);

  try {
    await redefinirSenha(
      usuariosRepository,
      analise.data.token,
      analise.data.senha,
      new Date(),
    );
  } catch (erro) {
    if (erro instanceof TokenDeRedefinicaoInvalidoError) return { erro: erro.message };
    if (erro instanceof DadosDeEntradaInvalidosError) return { erro: erro.message };
    throw erro;
  }

  redirect('/login?redefinida=1');
}

export async function acaoSair(): Promise<void> {
  await encerrarSessao();
  redirect('/');
}
