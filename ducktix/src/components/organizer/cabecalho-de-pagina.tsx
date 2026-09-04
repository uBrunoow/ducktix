import { ArrowLeft } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

/**
 * Cabeçalho padrão das telas do back-office: uma volta opcional, o título e
 * as ações da página à direita. Antes cada tela inventava o seu (uma
 * centralizada, outra à esquerda, outra sem nenhum) — é o tipo de deriva que
 * faz o painel não parecer um produto só.
 */
export function CabecalhoDePagina({
  titulo,
  descricao,
  voltar,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  voltar?: { readonly href: Route | string; readonly rotulo: string };
  acoes?: React.ReactNode;
}) {
  return (
    <div>
      {voltar ? (
        <Link
          href={voltar.href as Route}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} aria-hidden="true" />
          {voltar.rotulo}
        </Link>
      ) : null}

      <div
        className={`flex flex-wrap items-start justify-between gap-x-8 gap-y-4 ${voltar ? 'mt-4' : ''}`}
      >
        <div className="min-w-0">
          <h1 className="display m-0 text-2xl text-balance">{titulo}</h1>
          {descricao ? (
            <p className="mt-1 max-w-[68ch] text-[15px] text-fg-muted">{descricao}</p>
          ) : null}
        </div>
        {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
      </div>
    </div>
  );
}
