import { ChevronRight, PencilIcon } from 'lucide-react';
import Link from 'next/link';
import { CabecalhoDePagina } from '@/components/organizer/cabecalho-de-pagina';
import {
  BarraDeProporcao,
  BlocoDoPainel,
  TiraDeMetricas,
  formatarMoeda,
  formatarNumero,
} from '@/components/organizer/metricas';
import { AcaoPublicarEvento } from '@/components/organizer/acao-publicar-evento';
import { SeloStatus } from '@/components/selo-status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { montarPainel } from '@/server/event/application/painel-organizador';
import { localDeExibicao, rotuloModalidade } from '@/server/event/domain/evento';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { drizzleInscricoesRepository as inscricoesRepository } from '@/server/participation/infrastructure/drizzle-inscricoes';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// Formatadores separados de propósito: em pt-BR um formato composto vira
// "03 de out. de 2026", e partir isso por espaço devolve "de" no lugar do mês.
const diaDoMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' });
const mesCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

const FILTROS = [
  { chave: 'todos', rotulo: 'Todos' },
  { chave: 'futuros', rotulo: 'Próximos' },
  { chave: 'realizados', rotulo: 'Realizados' },
  { chave: 'rascunhos', rotulo: 'Rascunhos' },
] as const;

type ChaveDeFiltro = (typeof FILTROS)[number]['chave'];

export default async function EventosDoOrganizador({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { filtro = 'todos' } = await searchParams;
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/login');
  const agora = new Date();
  const painel = await montarPainel(catalogoPublicoRepository, inscricoesRepository, sessao.usuarioId, agora);

  const ativo: ChaveDeFiltro = FILTROS.some((f) => f.chave === filtro)
    ? (filtro as ChaveDeFiltro)
    : 'todos';

  const linhas = painel.linhas
    .filter((linha) => {
      if (ativo === 'futuros') return !linha.jaAconteceu && linha.evento.status === 'publicado';
      if (ativo === 'realizados') return linha.jaAconteceu;
      if (ativo === 'rascunhos') return linha.evento.status === 'rascunho';
      return true;
    })
    .sort((a, b) => b.evento.comecaEm.getTime() - a.evento.comecaEm.getTime());

  return (
    <div className="grid min-w-0 gap-6">
      <CabecalhoDePagina
        titulo="Eventos"
        descricao="Cada evento com sua ocupação, receita e presença. Clique para ver os participantes."
        acoes={
          <Button asChild>
            <Link href="/organizer/events/new">Criar evento</Link>
          </Button>
        }
      />

      <TiraDeMetricas
        itens={[
          {
            rotulo: 'Receita total',
            valor: formatarMoeda(painel.receitaCentavos),
            destaque: true,
          },
          {
            rotulo: 'Ingressos vendidos',
            valor: formatarNumero(painel.ingressosVendidos),
          },
          {
            rotulo: 'Ocupação média',
            valor: `${painel.ocupacaoMedia}%`,
          },
          {
            rotulo: 'Eventos',
            valor: formatarNumero(painel.totalEventos),
            apoio: `${painel.eventosPublicados} publicados · ${painel.eventosRascunho} rascunhos`,
          },
        ]}
      />

      <nav aria-label="Filtrar eventos" className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.chave}
            href={f.chave === 'todos' ? '/organizer/events' : `/organizer/events?filtro=${f.chave}`}
            aria-current={ativo === f.chave ? 'page' : undefined}
            className={
              ativo === f.chave
                ? 'rounded-chip border border-brand bg-brand-tint px-3.5 py-1.5 text-[13px] font-medium text-brand-ink'
                : 'rounded-chip border border-line bg-surface px-3.5 py-1.5 text-[13px] font-medium text-fg-muted transition-colors duration-150 hover:border-line-strong hover:text-fg'
            }
          >
            {f.rotulo}
          </Link>
        ))}
      </nav>

      <BlocoDoPainel
        titulo={FILTROS.find((f) => f.chave === ativo)?.rotulo ?? 'Todos'}
        descricao={`${formatarNumero(linhas.length)} ${linhas.length === 1 ? 'evento' : 'eventos'}.`}
      >
        {linhas.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold">Nenhum evento neste filtro.</p>
            <p className="mt-1 text-[13px] text-fg-muted">
              Troque o filtro acima ou crie um evento novo.
            </p>
            <Button asChild className="mt-4">
              <Link href="/organizer/events/new">Criar evento</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid gap-2">
            {linhas.map((linha) => {
              const { evento } = linha;
              const publicado = evento.status === 'publicado';

              return (
                <li
                  key={evento.id}
                  className="group rounded-lg border border-line bg-bg transition-colors duration-150 hover:border-line-strong"
                >
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-4 p-4">
                    <Link
                      href={`/organizer/events/${evento.id}`}
                      className="flex min-w-[14rem] flex-1 items-center gap-4"
                    >
                      <span className="flex w-14 shrink-0 flex-col items-center rounded-md border border-line bg-surface px-2 py-1.5 text-center">
                        <span className="display text-base leading-none tabular-nums">
                          {diaDoMes.format(evento.comecaEm)}
                        </span>
                        <span className="text-[10px] uppercase text-fg-muted">
                          {mesCurto.format(evento.comecaEm).replace('.', '')}
                        </span>
                      </span>

                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold group-hover:underline">
                            {evento.nome}
                          </span>
                          {publicado ? null : (
                            <Badge
                              variant="outline"
                              className="border-line bg-surface-2 text-fg-muted"
                            >
                              Rascunho
                            </Badge>
                          )}
                          <SeloStatus status={linha.status} />
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] text-fg-muted">
                          {hora.format(evento.comecaEm)} · {localDeExibicao(evento)} ·{' '}
                          {rotuloModalidade(evento.modalidade)}
                        </span>
                      </span>
                    </Link>

                    <div className="w-full sm:w-44">
                      <div className="flex items-baseline justify-between gap-2 text-[13px] tabular-nums">
                        <span className="text-fg-muted">
                          {formatarNumero(linha.ingressosVendidos)}/
                          {formatarNumero(linha.capacidade)}
                        </span>
                        <span className="font-medium">{linha.ocupacaoPercentual}%</span>
                      </div>
                      <BarraDeProporcao
                        percentual={linha.ocupacaoPercentual}
                        rotulo={`Ocupação de ${evento.nome}`}
                        className="mt-1.5"
                      />
                    </div>

                    <div className="w-24 text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatarMoeda(linha.receitaCentavos)}
                      </p>
                      <p className="text-[13px] text-fg-muted">
                        {linha.jaAconteceu
                          ? `${linha.participacao.taxaDePresenca}% presença`
                          : 'receita'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {publicado ? null : <AcaoPublicarEvento eventoId={evento.id} />}
                      <Button asChild variant="ghost" size="sm" className="text-fg-muted hover:text-fg">
                        <Link href={`/organizer/events/${evento.id}/edit`}>
                          <PencilIcon aria-hidden="true" />
                          Editar
                        </Link>
                      </Button>
                      <Link
                        href={`/organizer/events/${evento.id}`}
                        aria-label={`Abrir ${evento.nome}`}
                        className="grid size-8 place-items-center rounded-full text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
                      >
                        <ChevronRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </BlocoDoPainel>
    </div>
  );
}
