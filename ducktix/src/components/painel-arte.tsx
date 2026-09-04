/**
 * Painel de arte gerada em código: sem fotografia nesta fase, um padrão
 * geométrico determinístico dentro da paleta do sistema. Serve as capas de
 * evento e o banner de destaque, para que tudo pareça a mesma plataforma.
 */

const PADROES = [
  'repeating-linear-gradient(45deg, var(--tinta) 0 2px, transparent 2px 14px)',
  'radial-gradient(var(--tinta) 1.5px, transparent 1.5px)',
  'repeating-linear-gradient(0deg, var(--tinta) 0 1px, transparent 1px 12px)',
  'repeating-linear-gradient(90deg, var(--tinta) 0 3px, transparent 3px 22px)',
  'repeating-radial-gradient(circle at 82% 18%, var(--tinta) 0 1px, transparent 1px 16px)',
  'repeating-linear-gradient(-45deg, var(--tinta) 0 1px, transparent 1px 9px)',
] as const;

const TAMANHOS = ['auto', '14px 14px', 'auto', 'auto', 'auto', 'auto'] as const;

export function digerir(texto: string): number {
  let soma = 0;
  for (let i = 0; i < texto.length; i += 1) soma = (soma * 31 + texto.charCodeAt(i)) % 100000;
  return soma;
}

export function padraoDoIndice(semente: number) {
  const indice = semente % PADROES.length;
  return { backgroundImage: PADROES[indice], backgroundSize: TAMANHOS[indice] };
}

export function PainelArte({
  semente,
  emAmarelo,
  kicker,
  className = '',
  children,
}: {
  semente: number;
  emAmarelo?: boolean;
  kicker?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`relative flex aspect-video items-end overflow-hidden p-4 ${
        emAmarelo ? 'bg-brand text-brand-fg' : 'bg-surface-2 text-fg'
      } ${className}`}
      aria-hidden="true"
    >
      <span
        className="absolute inset-0"
        style={
          {
            ...padraoDoIndice(semente),
            '--tinta': emAmarelo
              ? 'color-mix(in srgb, var(--brand-fg) 15%, transparent)'
              : 'color-mix(in srgb, var(--fg) 13%, transparent)',
          } as React.CSSProperties
        }
      />
      {kicker ? (
        <span className="absolute left-3 top-3 rounded-chip bg-surface/80 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
          {kicker}
        </span>
      ) : null}
      {children}
    </div>
  );
}
