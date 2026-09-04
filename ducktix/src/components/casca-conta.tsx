import type { Route } from 'next';
import { Marca } from '@/components/marca';
import { Rotulo } from '@/components/moldura';
import Link from 'next/link';

/**
 * Casca de /login, /register, /forgot-password e /reset-password. Modo
 * Operate: uma coluna centrada, card branco sobre o canvas hachurado. A
 * moldura de filetes da vitrine não vem para cá — ela é gramática de página
 * de leitura, e aqui só existe uma tarefa a resolver.
 */
export function CascaConta({
  rotulo,
  titulo,
  descricao,
  children,
  rodape,
  largura = 'padrao',
}: {
  rotulo: string;
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  rodape?: React.ReactNode;
  /** `ampla` é para formulários que ganham com duas colunas — o registro. */
  largura?: 'padrao' | 'ampla';
}) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div aria-hidden="true" className="hatch fixed inset-0 -z-10" />

      <header className="px-5 pt-6 md:px-10">
        <Link href="/" className="inline-flex items-center gap-2">
          <Marca />
          <span className="display text-lg">Ducktix</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12 md:py-16">
        <div
          className={
            largura === 'ampla' ? 'w-full max-w-[38rem]' : 'w-full max-w-[27rem]'
          }
        >
          <div className="rounded-card border border-line bg-surface p-7 shadow-card md:p-9">
            <Rotulo>{rotulo}</Rotulo>
            <h1 className="display mt-4 text-[clamp(1.5rem,3vw,2.05rem)] leading-[1.2] text-balance">
              {titulo}
            </h1>
            {descricao ? (
              <p className="mt-3 text-[15px] leading-[1.6] text-fg-muted">{descricao}</p>
            ) : null}

            <div className="mt-7">{children}</div>
          </div>

          {rodape ? (
            <p className="mt-6 text-center text-sm text-fg-muted">{rodape}</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}

/** Link de apoio no rodapé da casca — o amarelo-tinta, nunca o amarelo cheio. */
export function LinkDeConta({
  href,
  children,
}: {
  href: Route;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-semibold text-brand-ink underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  );
}
