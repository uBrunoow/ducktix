/**
 * `Marca` e `Seta` vivem à parte de `cabecalho.tsx` de propósito: são SVGs
 * puros, sem dependência de servidor, usados por vários Client Components
 * (banner, busca, hero). `Cabecalho` agora lê a sessão (Drizzle/Postgres) e
 * arrasta `node:crypto`/`postgres` para dentro de quem importa dali — um
 * Client Component que só queria o ícone quebrava o build inteiro.
 */

export function Marca({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="var(--brand)" />
      <path
        d="M9.2 9.4a2.6 2.6 0 1 1 2.6 2.6H8.4l-1.9 2.2c1.4 2.1 3.6 3.2 6 3.2 3.4 0 5.8-2.3 5.8-5.6"
        fill="none"
        stroke="var(--brand-fg)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10.4" cy="8.9" r="0.85" fill="var(--brand-fg)" />
    </svg>
  );
}

export function Seta({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8h9M8.5 4l4 4-4 4" />
    </svg>
  );
}
