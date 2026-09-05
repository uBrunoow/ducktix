'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { alterarSenha } from '@/server/identity/application/alterar-senha';
import {
  atualizarCpfCnpj,
  atualizarEmail,
  atualizarFoto,
  atualizarNome,
} from '@/server/identity/application/atualizar-perfil';
import {
  CredenciaisInvalidasError,
  DadosDeEntradaInvalidosError,
  EmailJaCadastradoError,
} from '@/server/identity/domain/erros';
import { drizzleUsuariosRepository as usuariosRepository } from '@/server/identity/infrastructure/drizzle-usuarios';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { esquemaPerfil, esquemaSenha } from './schemas';

export interface RespostaDaConta {
  readonly erro?: string;
  readonly sucesso?: boolean;
}

async function exigirSessao() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/login');
  return sessao;
}

export async function acaoAtualizarPerfil(dados: unknown): Promise<RespostaDaConta> {
  const analise = esquemaPerfil.safeParse(dados);
  if (!analise.success) return { erro: analise.error.issues[0]?.message ?? 'Dados inválidos.' };

  const sessao = await exigirSessao();
  try {
    await atualizarNome(usuariosRepository, sessao.usuarioId, analise.data.nome);
    await atualizarEmail(usuariosRepository, sessao.usuarioId, analise.data.email);
    await atualizarCpfCnpj(usuariosRepository, sessao.usuarioId, analise.data.cpfCnpj);
  } catch (erro) {
    if (erro instanceof DadosDeEntradaInvalidosError) return { erro: erro.message };
    if (erro instanceof EmailJaCadastradoError) return { erro: erro.message };
    throw erro;
  }
  revalidatePath('/account');
  return { sucesso: true };
}

export async function acaoAtualizarFoto(fotoUrl: string): Promise<RespostaDaConta> {
  const sessao = await exigirSessao();
  try {
    await atualizarFoto(usuariosRepository, sessao.usuarioId, fotoUrl);
  } catch (erro) {
    if (erro instanceof DadosDeEntradaInvalidosError) return { erro: erro.message };
    throw erro;
  }
  revalidatePath('/account');
  return { sucesso: true };
}

export async function acaoAlterarSenha(dados: unknown): Promise<RespostaDaConta> {
  const analise = esquemaSenha.safeParse(dados);
  if (!analise.success) return { erro: analise.error.issues[0]?.message ?? 'Dados inválidos.' };

  const sessao = await exigirSessao();
  try {
    await alterarSenha(usuariosRepository, sessao.usuarioId, analise.data.senhaAtual, analise.data.novaSenha);
  } catch (erro) {
    if (erro instanceof CredenciaisInvalidasError) return { erro: erro.message };
    if (erro instanceof DadosDeEntradaInvalidosError) return { erro: erro.message };
    throw erro;
  }
  return { sucesso: true };
}
