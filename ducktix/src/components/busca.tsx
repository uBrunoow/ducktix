import { Seta } from '@/components/marca';
import { Button } from '@/components/ui/button';
import type { Filtros } from '@/server/event/application/vitrine';

/** Busca e filtros. Formulário GET: o estado vive na URL, não no cliente. */
export function Busca({
  filtros,
  categorias,
  cidades,
  action = '/',
}: {
  filtros: Filtros;
  categorias: readonly string[];
  cidades: readonly string[];
  action?: string;
}) {
  return (
    <form
      className="grid gap-2 rounded-card border border-line bg-surface p-2 shadow-card md:grid-cols-[1fr_auto_auto_auto] md:items-center"
      action={action}
      method="get"
      role="search"
    >
      <label className="flex items-center gap-2.5 rounded-full px-4 text-fg-muted focus-within:text-fg">
        <span className="sr-only">Buscar evento, organizador ou categoria</span>
        <Lupa />
        <input
          type="search"
          name="q"
          defaultValue={filtros.busca ?? ''}
          placeholder="Buscar evento, organizador ou categoria"
          className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm text-fg outline-none [&::-webkit-search-cancel-button]:grayscale-100"
        />
      </label>

      <Seletor name="cidade" defaultValue={filtros.cidade ?? ''} rotulo="Cidade">
        <option value="">Todas as cidades</option>
        {cidades.map((cidade) => (
          <option key={cidade} value={cidade}>
            {cidade}
          </option>
        ))}
      </Seletor>

      <Seletor name="categoria" defaultValue={filtros.categoria ?? ''} rotulo="Categoria">
        <option value="">Todas as categorias</option>
        {categorias.map((categoria) => (
          <option key={categoria} value={categoria}>
            {categoria}
          </option>
        ))}
      </Seletor>

      <Button type="submit">
        Buscar
        <Seta />
      </Button>
    </form>
  );
}

function Seletor({
  name,
  defaultValue,
  rotulo,
  children,
}: {
  name: string;
  defaultValue: string;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="sr-only">{rotulo}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full cursor-pointer appearance-none rounded-full border border-line bg-bg bg-[image:linear-gradient(45deg,transparent_50%,currentColor_50%),linear-gradient(135deg,currentColor_50%,transparent_50%)] bg-[position:calc(100%-20px)_50%,calc(100%-15px)_50%] bg-[size:5px_5px,5px_5px] bg-no-repeat py-3 pl-4 pr-9 text-sm text-fg transition-colors duration-150 hover:border-line-strong md:w-auto"
      >
        {children}
      </select>
    </label>
  );
}

function Lupa() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      className="flex-none"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  );
}
