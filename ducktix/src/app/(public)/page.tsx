import { BannerDestaques } from '@/components/banner-destaques';
import { Busca } from '@/components/busca';
import { Cabecalho } from '@/components/cabecalho';
import { Seta } from '@/components/marca';
import { CardEvento } from '@/components/card-evento';
import { FaixaCategorias } from '@/components/faixa-categorias';
import { FaixaDeEventos } from '@/components/faixa-de-eventos';
import { Faq } from '@/components/faq';
import { Heroi } from '@/components/heroi';
import { Faixa, Filete, Moldura, TituloDeSecao } from '@/components/moldura';
import { Rodape } from '@/components/rodape';
import { Button } from '@/components/ui/button';
import {
  type Filtros,
  buscarEventos,
  montarVitrine,
  temFiltro,
} from '@/server/event/application/vitrine';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import type { Route } from 'next';
import Link from 'next/link';

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
  return partes.join(' · ');
}

export default async function Home({
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
  };
  const mostrarTodos = primeiro(params.todos) === '1';

  const filtrando = temFiltro(filtros);
  const resultado = await buscarEventos(catalogo, filtros, agora);
  const vitrine = filtrando ? null : await montarVitrine(catalogo, agora);

  const futuros = resultado.entradas.filter((e) => e.evento.comecaEm > agora);
  const visiveis = mostrarTodos ? futuros : futuros.slice(0, 8);
  const restam = futuros.length - visiveis.length;

  return (
    <Moldura>
      <Cabecalho />

      {filtrando ? (
        <Faixa>
          <TituloDeSecao
            rotulo="Resultado da busca"
            titulo={`${resultado.total} ${resultado.total === 1 ? 'evento encontrado' : 'eventos encontrados'}`}
            descricao={descreverFiltro(filtros)}
            acao={
              <Button asChild variant="outline">
                <Link href="/">Limpar filtros</Link>
              </Button>
            }
          />

          <div className="mt-8">
            <Busca
              filtros={filtros}
              categorias={resultado.categorias}
              cidades={resultado.cidades}
            />
          </div>

          {resultado.total === 0 ? (
            <Vazio
              titulo="Nada encontrado para esta combinação"
              texto="Tente outra cidade, remova a categoria ou busque por um termo mais curto — “jazz” em vez de “noite de jazz no porto”."
              acao={{ rotulo: 'Ver todos os eventos', href: '/' }}
            />
          ) : (
            <Grade>
              {resultado.entradas.map((entrada) => (
                <CardEvento key={entrada.evento.id} entrada={entrada} />
              ))}
            </Grade>
          )}
        </Faixa>
      ) : vitrine === null || vitrine.total === 0 ? (
        <Faixa>
          <Vazio
            titulo="Nenhum evento publicado ainda"
            texto="A vitrine abre assim que o primeiro evento for publicado. Se o evento é seu, essa parte depende de você."
            acao={{ rotulo: 'Criar meu evento', href: '/organizer/events/new' }}
          />
        </Faixa>
      ) : (
        <>
          <Heroi totalDeEventos={vitrine.total} />

          <Filete />
          <Faixa className="py-10 md:py-12">
            <Busca
              filtros={filtros}
              categorias={vitrine.categorias}
              cidades={vitrine.cidades}
            />
          </Faixa>

          <Filete />
          <Faixa>
            <BannerDestaques destaques={vitrine.destaques} />
          </Faixa>

          <Filete />
          <Faixa id="explorar-categorias">
            <TituloDeSecao
              rotulo="Categorias"
              titulo="Explore por onde a sua noite começa"
              descricao="Cada categoria abre o catálogo já filtrado."
            />
            <FaixaCategorias categorias={vitrine.categorias} />
          </Faixa>

          {vitrine.faixas.slice(0, 2).map((faixa) => (
            <div key={faixa.id}>
              <Filete />
              <Faixa>
                <FaixaDeEventos faixa={faixa} />
              </Faixa>
            </div>
          ))}

          <BandaParticipante />

          {vitrine.faixas.slice(2).map((faixa) => (
            <div key={faixa.id}>
              <Faixa>
                <FaixaDeEventos faixa={faixa} />
              </Faixa>
              <Filete />
            </div>
          ))}

          <Faixa id="todos">
            <TituloDeSecao
              rotulo="Catálogo completo"
              titulo="Todos os eventos"
              descricao={`${vitrine.total} eventos publicados, do mais próximo ao mais distante.`}
            />

            <Grade>
              {visiveis.map((entrada) => (
                <CardEvento key={entrada.evento.id} entrada={entrada} />
              ))}
            </Grade>

            {restam > 0 ? (
              <div className="mt-10 flex justify-center">
                <Button asChild variant="outline" size="lg">
                  <Link href="/?todos=1#todos">Ver todos ({restam} a mais)</Link>
                </Button>
              </div>
            ) : null}
          </Faixa>
        </>
      )}

      <Filete />
      <Faixa id="faq">
        <TituloDeSecao rotulo="Dúvidas" titulo="Perguntas frequentes" />
        <Faq />
      </Faixa>

      <ChamadaFinal />
      <Rodape />
    </Moldura>
  );
}

function Grade({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}

function Vazio({
  titulo,
  texto,
  acao,
}: {
  titulo: string;
  texto: string;
  acao: { rotulo: string; href: Route };
}) {
  return (
    <div className="mt-8 rounded-card border border-line bg-surface px-6 py-16 text-center shadow-card">
      <h2 className="display m-0 text-2xl">{titulo}</h2>
      <p className="mx-auto mt-3 max-w-[52ch] text-[15px] text-fg-muted">{texto}</p>
      <Button asChild className="mt-7">
        <Link href={acao.href}>
          {acao.rotulo}
          <Seta />
        </Link>
      </Button>
    </div>
  );
}

/** Banda amarela full-bleed: o divisor mais alto do sistema, usado uma vez. */
function BandaParticipante() {
  return (
    <section className="bg-brand text-brand-fg">
      <div className="grid items-center gap-6 px-5 py-14 md:grid-cols-[1fr_auto] md:px-10">
        <div>
          <h2 className="display m-0 text-[clamp(1.5rem,3vw,2.25rem)] text-balance">
            Seus ingressos, num só lugar.
          </h2>
          <p className="mt-3 max-w-[54ch] text-[15px] text-brand-fg/75">
            Crie uma conta para acompanhar inscrições, receber o ingresso
            digital e chegar ao check-in sem fila.
          </p>
        </div>
        <Button asChild variant="inverso" size="lg">
          <Link href="/register">
            Criar minha conta
            <Seta />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function ChamadaFinal() {
  return (
    <>
      <Filete />
      <Faixa className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="dotgrid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_50%,#000,transparent)]"
        />
        <div className="relative mx-auto max-w-[42rem] text-center">
          <h2 className="display m-0 text-[clamp(1.75rem,4vw,3rem)] text-balance">
            Do rascunho ao relatório de presença.
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-[15px] text-fg-muted">
            Crie o evento, abra os lotes e acompanhe pedidos, pagamentos e
            check-in sem sair do painel.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-x-7 gap-y-4">
            <Button asChild size="lg">
              <Link href="/organizer/events/new">
                Publicar meu evento
                <Seta />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/events">Ver o que já está rolando</Link>
            </Button>
          </div>
        </div>
      </Faixa>
    </>
  );
}
