import 'server-only';
import { cookies } from 'next/headers';
import {
  type CargaDaSessao,
  NOME_DO_COOKIE,
  VALIDADE_SEGUNDOS,
  codificarSessao,
  decodificarSessao,
} from './sessao-codec';

/**
 * Sessão em cookie httpOnly, sem biblioteca de terceiros: o cookie carrega
 * {usuarioId, papel} em base64url. Sem assinatura criptográfica — a
 * disciplina não exige segurança de sessão de produção (docs/guidelines.md,
 * "autenticação pode ser simples") e nada de sensível vive no cookie além do
 * id. Trocar por um JWT assinado ou por sessão em banco não muda quem chama
 * `sessaoAtual()`. Codec em `sessao-codec.ts` porque o middleware (Edge) lê
 * o mesmo cookie sem poder importar `next/headers`.
 */

export type { CargaDaSessao };

export async function iniciarSessao(carga: CargaDaSessao): Promise<void> {
  const loja = await cookies();
  loja.set(NOME_DO_COOKIE, codificarSessao(carga), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: VALIDADE_SEGUNDOS,
  });
}

export async function encerrarSessao(): Promise<void> {
  const loja = await cookies();
  loja.delete(NOME_DO_COOKIE);
}

export async function sessaoAtual(): Promise<CargaDaSessao | null> {
  const loja = await cookies();
  return decodificarSessao(loja.get(NOME_DO_COOKIE)?.value);
}
