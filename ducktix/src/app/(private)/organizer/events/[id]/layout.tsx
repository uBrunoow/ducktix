import { CalendarIcon, ExternalLinkIcon, MapPinIcon, PencilIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CapaEvento } from '@/components/capa-evento';
import { AbasDoEvento } from '@/components/organizer/abas-do-evento';
import { Selo } from '@/components/organizer/selo';
import { Button } from '@/components/ui/button';
import {
  localDeExibicao,
  rotuloModalidade,
  rotuloStatus,
  rotuloStatusEvento,
  rotuloVisibilidade,
  statusDoEvento,
} from '@/server/event/domain/evento';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';

export const dynamic = 'force-dynamic';

const dataLonga = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Casca comum das telas de um evento.
 *
 * O cabeçalho fica aqui e não em cada página porque ele é o que dá âncora ao
 * contexto: navegando entre lotes, pedidos e portaria, o organizador nunca
 * perde de vista de qual evento está falando. A navegação entre as seções é
 * em abas logo abaixo do cabeçalho — a sidebar, quando um evento está
 * selecionado, vira só o seletor de contexto e a ação de criar evento.
 */
export default async function LayoutDoEvento({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await sessaoAtual();
  const evento = await catalogoPublicoRepository.buscarPorId(id);
  // O middleware já garante papel === 'organizador' em toda /organizer/**;
  // aqui é a checagem de que ESTE evento é dele — sem isso, um organizador
  // adivinha a URL de outro e edita/exclui o evento alheio.
  if (!evento || !sessao || evento.organizadorUsuarioId !== sessao.usuarioId) notFound();

  const agora = new Date();
  const publicado = evento.status === 'publicado';
  const comercial = statusDoEvento(evento, agora);

  return (
    <div className="grid min-w-0 gap-6">
      <div className="grid gap-4">
        <Link
          href="/organizer/events"
          className="text-[13px] font-medium text-fg-muted transition-colors hover:text-fg"
        >
          Eventos
        </Link>

        <div className="flex flex-wrap items-start gap-4 sm:gap-5">
          {/* A capa é a mesma peça usada no card público e no checkout — o
              organizador reconhece a mesma arte que o participante vê. */}
          <div className="w-16 shrink-0 overflow-hidden rounded-[calc(var(--r-card)-0.4rem)] sm:w-20">
            <CapaEvento evento={evento} compacto comKicker={false} className="aspect-square" />
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-8 gap-y-4">
            <div className="min-w-0">
              <h1 className="display m-0 text-2xl text-balance">{evento.nome}</h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-fg-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarIcon className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                  {dataLonga.format(evento.comecaEm)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPinIcon className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                  {localDeExibicao(evento)} · {rotuloModalidade(evento.modalidade)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {publicado ? (
                <Button asChild variant="secondary">
                  <Link href={`/events/${evento.slug}`}>
                    <ExternalLinkIcon aria-hidden="true" />
                    Ver página pública
                  </Link>
                </Button>
              ) : null}
              <Button asChild>
                <Link href={`/organizer/events/${evento.id}/edit`}>
                  <PencilIcon aria-hidden="true" />
                  Editar evento
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Selo tom={publicado ? 'ok' : 'atencao'}>{rotuloStatusEvento(evento.status)}</Selo>
          <Selo>{rotuloVisibilidade(evento.visibilidade)}</Selo>
          <Selo>{evento.categoria}</Selo>
          {comercial === 'a-venda' ? null : (
            <Selo tom={comercial === 'ultimo-lote' ? 'marca' : 'neutro'}>
              {rotuloStatus(comercial)}
            </Selo>
          )}
          {agora >= evento.comecaEm ? <Selo>Já aconteceu</Selo> : null}
        </div>
      </div>

      <AbasDoEvento eventoId={evento.id} />

      {children}
    </div>
  );
}
