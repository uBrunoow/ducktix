import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Hash de senha com scrypt (nativo do Node — sem dependência extra). O
 * projeto é acadêmico e a disciplina não exige criptografia de produção
 * (docs/guidelines.md, "Segurança": "autenticação pode ser simples"), mas
 * senha em texto puro não entra: scrypt + salt aleatório é o mínimo honesto.
 */

const TAMANHO_DO_SAL = 16;
const TAMANHO_DA_CHAVE = 64;

export function hashDaSenha(senhaEmTexto: string): string {
  const sal = randomBytes(TAMANHO_DO_SAL);
  const chave = scryptSync(senhaEmTexto, sal, TAMANHO_DA_CHAVE);
  return `${sal.toString('hex')}:${chave.toString('hex')}`;
}

export function senhaConfere(senhaEmTexto: string, hash: string): boolean {
  const [salHex, chaveHex] = hash.split(':');
  if (!salHex || !chaveHex) return false;

  const sal = Buffer.from(salHex, 'hex');
  const chaveEsperada = Buffer.from(chaveHex, 'hex');
  const chaveObtida = scryptSync(senhaEmTexto, sal, TAMANHO_DA_CHAVE);

  return (
    chaveObtida.length === chaveEsperada.length &&
    timingSafeEqual(chaveObtida, chaveEsperada)
  );
}
