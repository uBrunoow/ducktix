import { cn } from '@/lib/utils';

/**
 * A moldura: coluna central sobre o canvas, emoldurada por filetes verticais
 * full-bleed, com os gutters hachurados a 45°. É a assinatura do mundo — a
 * página continua reconhecível com todo o conteúdo removido.
 */
export function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      {/* A hachura vive numa camada fixa do tamanho do viewport. Pintada sobre
          o documento inteiro, o gradiente repetido cobre milhares de pixels de
          altura e trava a composição da página. */}
      <div aria-hidden="true" className="hatch fixed inset-0 -z-10" />
      <div className="mx-auto w-full max-w-[1180px] border-x border-line bg-bg">
        {children}
      </div>
    </div>
  );
}

/** Faixa útil dentro da moldura. */
export function Faixa({
  children,
  className,
  ...props
}: React.ComponentProps<'section'>) {
  return (
    <section className={cn('px-5 py-16 md:px-10 md:py-20', className)} {...props}>
      {children}
    </section>
  );
}

/**
 * Divisor entre faixas: filete de 1px com marcador em cruz nas duas pontas,
 * onde ele encontra os filetes verticais da moldura.
 */
export function Filete({ className }: { className?: string }) {
  return (
    <div className={cn('relative border-t border-line', className)} aria-hidden="true">
      <span className="tick absolute left-0 top-0" />
      <span className="tick absolute right-0 top-0" />
    </div>
  );
}

/** Chip-rótulo acima de um título de seção. */
export function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-chip border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg-muted">
      {children}
    </span>
  );
}

export function TituloDeSecao({
  rotulo,
  titulo,
  descricao,
  acao,
  id,
}: {
  rotulo?: string;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div>
        {rotulo ? <Rotulo>{rotulo}</Rotulo> : null}
        <h2
          id={id}
          className={cn(
            'display m-0 text-[clamp(1.5rem,3vw,2.25rem)] text-balance',
            rotulo && 'mt-4',
          )}
        >
          {titulo}
        </h2>
        {descricao ? (
          <p className="mt-2 max-w-[62ch] text-[15px] text-fg-muted">{descricao}</p>
        ) : null}
      </div>
      {acao}
    </div>
  );
}
