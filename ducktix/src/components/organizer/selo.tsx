import { cn } from '@/lib/utils';

/**
 * Selo de estado do back-office.
 *
 * É o único lugar do sistema onde entra cor fora do amarelo: um painel
 * operacional precisa distinguir "pago" de "falhou" numa varredura de
 * cinquenta linhas, e peso de fonte não faz isso. A regra que mantém o
 * design system de pé é o escopo — a cor semântica vive dentro do selo, e o
 * amarelo continua sendo o único acento que a página usa para dizer "olhe
 * aqui". Gráfico segue série única em amarelo (ver docs/DESIGN.md).
 */
export type TomDeSelo = 'neutro' | 'ok' | 'atencao' | 'erro' | 'marca';

const TONS: Record<TomDeSelo, string> = {
  neutro: 'border-line bg-surface-2 text-fg-muted',
  ok: 'border-ok/25 bg-ok-tint text-ok',
  atencao: 'border-warn/25 bg-warn-tint text-warn',
  erro: 'border-danger/25 bg-danger-tint text-danger',
  marca: 'border-brand bg-brand text-brand-fg',
};

export function Selo({
  children,
  tom = 'neutro',
  className,
}: {
  children: React.ReactNode;
  tom?: TomDeSelo;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-chip border px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap',
        TONS[tom],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Ponto de estado — usado dentro do selo quando a cor precisa de reforço
 *  de forma para quem não distingue matiz. */
export function Ponto({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('size-1.5 rounded-full bg-current', className)}
    />
  );
}
