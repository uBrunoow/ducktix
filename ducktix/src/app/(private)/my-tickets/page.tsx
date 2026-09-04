import { ChevronRight, TicketX } from 'lucide-react';
import Link from 'next/link';
import { CapaEvento } from '@/components/capa-evento';
import { Cabecalho } from '@/components/cabecalho';
import { Faixa, Filete, Moldura, TituloDeSecao } from '@/components/moldura';
import { Rodape } from '@/components/rodape';
import { SeloStatusIngresso } from '@/components/selo-status-ingresso';
import { Button } from '@/components/ui/button';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { localDeExibicao } from '@/server/event/domain/evento';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { listarIngressosDoParticipante } from '@/server/participation/application/meus-ingressos';
import { nomeDeExibicao } from '@/server/participation/domain/ingresso';
import { drizzleIngressosRepository as memoriaIngressosRepository } from '@/server/participation/infrastructure/drizzle-ingressos';
import { drizzlePedidosRepository as pedidosRepository } from '@/server/ticketing/infrastructure/drizzle-pedidos';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const diaDaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const diaMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default async function PaginaDeIngressos() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/login?next=%2Fmy-tickets');

  const resultado = await listarIngressosDoParticipante(
    pedidosRepository,
    memoriaIngressosRepository,
    sessao.usuarioId,
  );

  const comEvento = await Promise.all(
    resultado.map(async ({ ingresso, eventoId }) => {
      const evento = await catalogoPublicoRepository.buscarPorId(eventoId);
      return { ingresso, evento };
    }),
  );

  comEvento.sort((a, b) => {
    const dataA = a.evento?.comecaEm.getTime() ?? 0;
    const dataB = b.evento?.comecaEm.getTime() ?? 0;
    return dataB - dataA;
  });

  return (
    <Moldura>
      <Cabecalho />
      <Faixa className="py-14 md:py-20">
        <TituloDeSecao
          rotulo="Sua conta"
          titulo="Meus ingressos"
          descricao={
            comEvento.length > 0
              ? `${comEvento.length} ${comEvento.length === 1 ? 'ingresso emitido' : 'ingressos emitidos'} para os seus eventos.`
              : undefined
          }
        />

        {comEvento.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-4 rounded-card border border-line bg-surface px-8 py-16 text-center shadow-card">
            <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
              <TicketX className="size-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Você ainda não tem nenhum ingresso.</p>
              <p className="mt-1 text-[13px] text-fg-muted">
                Encontre um evento e garanta o seu lugar.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link href="/events">Ver eventos</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-10 grid gap-3">
            {comEvento.map(({ ingresso, evento }) => (
              <li key={ingresso.id}>
                <Link
                  href={`/my-tickets/${ingresso.id}`}
                  className="group flex items-center gap-4 rounded-card border border-line bg-surface p-3 shadow-card transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-brand sm:gap-5 sm:p-4"
                >
                  <div className="w-20 shrink-0 overflow-hidden rounded-[calc(var(--r-card)-0.4rem)] sm:w-28">
                    {evento ? (
                      <CapaEvento
                        evento={evento}
                        compacto
                        comKicker={false}
                        className="aspect-square sm:aspect-video"
                      />
                    ) : (
                      <div className="aspect-square bg-surface-2 sm:aspect-video" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-brand-ink">
                      {evento
                        ? `${diaDaSemana.format(evento.comecaEm).replace('.', '')} · ${diaMes.format(evento.comecaEm).replace('.', '')} · ${hora.format(evento.comecaEm)}`
                        : 'Data indisponível'}
                    </p>
                    <h3 className="display m-0 truncate text-base sm:text-lg">
                      {evento?.nome ?? 'Evento removido'}
                    </h3>
                    <p className="mt-0.5 truncate text-[13px] text-fg-muted">
                      {nomeDeExibicao(ingresso)}
                      {evento ? ` · ${localDeExibicao(evento)}` : ''}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <SeloStatusIngresso status={ingresso.status} />
                    <ChevronRight
                      className="size-4 text-fg-muted transition-transform duration-200 group-hover:translate-x-0.5"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Faixa>
      <Filete />
      <Rodape />
    </Moldura>
  );
}
