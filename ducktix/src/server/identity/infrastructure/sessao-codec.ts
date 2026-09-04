import type { Papel } from '../domain/usuario';

/**
 * Codec puro do cookie de sessão — sem `next/headers`, sem `server-only`.
 * Existe à parte de `sessao.ts` porque o middleware roda em Edge runtime e
 * lê o cookie por `NextRequest.cookies`, não por `cookies()` de
 * `next/headers`; as Server Actions e Server Components continuam usando
 * `sessao.ts`, que empacota este codec com a API de cookies do Next.
 */

export const NOME_DO_COOKIE = 'ducktix_sessao';
export const VALIDADE_SEGUNDOS = 60 * 60 * 24 * 7; // 7 dias

export interface CargaDaSessao {
  usuarioId: string;
  papel: Papel;
}

export function codificarSessao(carga: CargaDaSessao): string {
  return Buffer.from(JSON.stringify(carga), 'utf8').toString('base64url');
}

export function decodificarSessao(valorDoCookie: string | undefined): CargaDaSessao | null {
  if (!valorDoCookie) return null;
  try {
    const carga = JSON.parse(Buffer.from(valorDoCookie, 'base64url').toString('utf8'));
    if (typeof carga?.usuarioId !== 'string' || typeof carga?.papel !== 'string') return null;
    return carga as CargaDaSessao;
  } catch {
    return null;
  }
}
