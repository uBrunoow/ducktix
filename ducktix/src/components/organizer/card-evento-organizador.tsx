import Link from 'next/link';
import { CapaEvento } from '@/components/capa-evento';
import { AcaoEditarEvento } from '@/components/organizer/acao-editar-evento';
import { AcaoPublicarEvento } from '@/components/organizer/acao-publicar-evento';
import { SeloStatus } from '@/components/selo-status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  type Evento,
  type StatusLote,
  localDeExibicao,
  rotuloModalidade,
} from '@/server/event/domain/evento';

const diaDaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function preco(centavos: number | null): string {
  if (centavos === null) return 'Indisponível';
  if (centavos === 0) return 'Gratuito';
  return `a partir de ${moeda.format(centavos / 100)}`;
}

/**
 * Mesmo card da vitrine pública, mas sem o link envolvendo tudo: aqui o
 * organizador precisa de dois destinos — ver a página pública ou editar —
 * então o link vive só na capa/título, e as ações vivem num rodapé próprio.
 */
export function CardEventoOrganizador({
  evento,
  status,
  precoCentavos,
}: {
  evento: Evento;
  status: StatusLote;
  precoCentavos: number | null;
}) {
  const publicado = evento.status === 'publicado';

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-brand">
      {publicado ? (
        <Link href={`/events/${evento.slug}`} className="block">
          <CapaEvento evento={evento} />
        </Link>
      ) : (
        <CapaEvento evento={evento} />
      )}

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-brand-ink">
            {diaDaSemana.format(evento.comecaEm)} · {hora.format(evento.comecaEm)}
          </p>
          {publicado ? null : (
            <Badge variant="outline" className="border-line bg-surface-2 text-fg-muted">
              Rascunho
            </Badge>
          )}
        </div>

        <h3 className="display m-0 line-clamp-2 text-lg">
          {publicado ? (
            <Link href={`/events/${evento.slug}`} className="hover:underline">
              {evento.nome}
            </Link>
          ) : (
            evento.nome
          )}
        </h3>

        <p className="text-[13px] text-fg-muted">
          {localDeExibicao(evento)} · {rotuloModalidade(evento.modalidade)}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2.5 pt-4">
          <span className="text-[13px] font-semibold">{preco(precoCentavos)}</span>
          {status === 'a-venda' ? null : <SeloStatus status={status} />}
        </div>

        <div className="mt-3 flex items-center justify-between gap-1.5 border-t border-line pt-3">
          {publicado ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/events/${evento.slug}`}>Ver página</Link>
            </Button>
          ) : (
            <AcaoPublicarEvento eventoId={evento.id} />
          )}
          <AcaoEditarEvento />
        </div>
      </div>
    </div>
  );
}
