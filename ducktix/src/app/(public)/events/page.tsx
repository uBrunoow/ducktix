import Link from 'next/link';
import { Seta } from '@/components/marca';
import { CardEvento } from '@/components/card-evento';
import { Cabecalho } from '@/components/cabecalho';
import { Busca } from '@/components/busca';
import { Faixa, Filete, Moldura, TituloDeSecao } from '@/components/moldura';
import { Rodape } from '@/components/rodape';
import { Button } from '@/components/ui/button';
import {
  type Filtros,
  buscarEventos,
} from '@/server/event/application/vitrine';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';

export const dynamic = 'force-dynamic';

const catalogo = catalogoPublicoRepository;

function primeiro(valor: string | string[] | undefined): string | undefined {
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  const limpo = bruto?.trim();
  return limpo ? limpo : undefined;
}

function descreverFiltro(filtros: Filtros): string {
  const partes: string[] = [];
  if (filtros.busca) partes.push(`“${filtros.busca}”`);
  if (filtros.categoria) partes.push(filtros.categoria);
  if (filtros.cidade) partes.push(filtros.cidade);
  if (filtros.quando === 'semana') partes.push('esta semana');
  if (filtros.preco === 'gratuito') partes.push('gratuito');
  return partes.join(' · ');
}

export default async function PaginaEventos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const agora = new Date();

  const filtros: Filtros = {
    busca: primeiro(params.q),
    categoria: primeiro(params.categoria),
    cidade: primeiro(params.cidade),
    quando: primeiro(params.quando) === 'semana' ? 'semana' : undefined,
    preco: primeiro(params.preco) === 'gratuito' ? 'gratuito' : undefined,
  };

  const resultado = await buscarEventos(catalogo, filtros, agora);
  const futuros = resultado.entradas.filter((e) => e.evento.comecaEm > agora);
  const temFiltroAtivo =
    filtros.busca || filtros.categoria || filtros.cidade || filtros.quando || filtros.preco;

  return (
    <Moldura>
      <Cabecalho />

      <Faixa>
        <TituloDeSecao
          rotulo="Catálogo completo"
          titulo="Todos os eventos"
          descricao={
            temFiltroAtivo
              ? `${futuros.length} ${futuros.length === 1 ? 'evento encontrado' : 'eventos encontrados'} · ${descreverFiltro(filtros)}`
              : `${futuros.length} eventos publicados, do mais próximo ao mais distante.`
          }
          acao={
            temFiltroAtivo ? (
              <Button asChild variant="outline">
                <Link href="/events">Limpar filtros</Link>
              </Button>
            ) : undefined
          }
        />

        <div className="mt-8">
          <Busca
            filtros={filtros}
            categorias={resultado.categorias}
            cidades={resultado.cidades}
            action="/events"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <ChipDeFiltro
              ativo={filtros.quando === 'semana'}
              href={alternarParam(filtros, 'quando', 'semana')}
            >
              Esta semana
            </ChipDeFiltro>
            <ChipDeFiltro
              ativo={filtros.preco === 'gratuito'}
              href={alternarParam(filtros, 'preco', 'gratuito')}
            >
              Gratuito
            </ChipDeFiltro>
          </div>
        </div>

        {futuros.length === 0 ? (
          <div className="mt-10 rounded-card border border-line bg-surface px-6 py-16 text-center shadow-card">
            <h2 className="display m-0 text-2xl">Nada encontrado para esta combinação</h2>
            <p className="mx-auto mt-3 max-w-[52ch] text-[15px] text-fg-muted">
              Tente outra cidade, remova a categoria ou busque por um termo mais
              curto — “jazz” em vez de “noite de jazz no porto”.
            </p>
            <Button asChild className="mt-7">
              <Link href="/events">
                Ver todos os eventos
                <Seta />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {futuros.map((entrada) => (
              <CardEvento key={entrada.evento.id} entrada={entrada} />
            ))}
          </div>
        )}
      </Faixa>

      <Filete />
      <Rodape />
    </Moldura>
  );
}

/** Monta a URL de /events com um filtro de chip ligado/desligado. */
function alternarParam(
  filtros: Filtros,
  chave: 'quando' | 'preco',
  valor: string,
): string {
  const params = new URLSearchParams();
  if (filtros.busca) params.set('q', filtros.busca);
  if (filtros.categoria) params.set('categoria', filtros.categoria);
  if (filtros.cidade) params.set('cidade', filtros.cidade);
  if (filtros.quando) params.set('quando', filtros.quando);
  if (filtros.preco) params.set('preco', filtros.preco);

  const ligado = filtros[chave] === valor;
  if (ligado) params.delete(chave);
  else params.set(chave, valor);

  const query = params.toString();
  return query ? `/events?${query}` : '/events';
}

function ChipDeFiltro({
  ativo,
  href,
  children,
}: {
  ativo: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href as '/events'}
      aria-pressed={ativo}
      className={
        ativo
          ? 'rounded-chip border border-brand bg-brand px-3.5 py-1.5 text-sm font-medium text-brand-fg'
          : 'rounded-chip border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:border-line-strong hover:text-fg'
      }
    >
      {children}
    </Link>
  );
}
