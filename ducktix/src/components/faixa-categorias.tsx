const ICONES: Record<string, string> = {
  Tecnologia: 'M4 4h16v12H4z M8 20h8 M12 16v4',
  Música: 'M9 18V5l10-2v13 M9 9l10-2',
  Esporte: 'M12 3a9 9 0 100 18 9 9 0 000-18z M3 12h18 M12 3a13 13 0 010 18 M12 3a13 13 0 000 18',
  Cultura: 'M4 20V10l8-6 8 6v10 M4 20h16 M10 20v-6h4v6',
  Gastronomia: 'M7 3v7a2 2 0 002 2 2 2 0 002-2V3 M7 3v18 M17 3c-2 0-3 2-3 5v3h3v9 M17 3v18',
  Arte: 'M12 4a8 8 0 100 16c1.5 0 2-.7 2-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.7-1.6 1.6-1.6H16a4 4 0 004-4c0-4-3.6-6.4-8-6.4z',
  Design: 'M3 17l6-6 4 4 8-8 M13 3h8v8',
  Ciência: 'M9 2v6L4 20a2 2 0 002 2h12a2 2 0 002-2L15 8V2 M9 2h6 M7 14h10',
  Literatura: 'M4 4h9a3 3 0 013 3v13a3 3 0 00-3-3H4z M20 4h-4a3 3 0 00-3 3v13a3 3 0 013-3h4z',
  Cinema: 'M3 6h18v13H3z M3 10h18 M7 6v4 M12 6v4 M17 6v4',
  Urbanismo: 'M4 21V9l6-5 6 5v12 M4 21h16 M14 21V9l6-5v17',
  Teatro: 'M8 4a4 4 0 108 0 M4 12c2 3 5 4 8 4s6-1 8-4 M8 20a10 10 0 018 0',
  Humor: 'M12 3a9 9 0 100 18 9 9 0 000-18z M9 10h.01 M15 10h.01 M8 14c1 1.5 2.5 2 4 2s3-.5 4-2',
};

const PADRAO = 'M4 4h16v16H4z';

/**
 * Navegação por categoria. Ícones desenhados no mesmo traço de 1.6px do
 * sistema, nunca glifo de fonte ou emoji.
 */
export function FaixaCategorias({ categorias }: { categorias: readonly string[] }) {
  return (
    <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {categorias.map((categoria) => (
        <a
          key={categoria}
          href={`/events?categoria=${encodeURIComponent(categoria)}`}
          className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 text-fg shadow-card transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-brand"
        >
          <span className="grid size-9 flex-none place-items-center rounded-full bg-brand-tint text-brand-ink">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d={ICONES[categoria] ?? PADRAO} />
            </svg>
          </span>
          <span className="text-sm font-medium">{categoria}</span>
        </a>
      ))}
    </div>
  );
}
