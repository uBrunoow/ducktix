import Link from 'next/link';
import { CapaEvento } from '@/components/capa-evento';
import { SeloStatus } from '@/components/selo-status';
import type { EntradaDaVitrine } from '@/server/event/application/vitrine';
import { localDeExibicao, rotuloModalidade } from '@/server/event/domain/evento';

const diaDaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function preco(centavos: number | null): string {
  if (centavos === null) return 'Indisponível';
  if (centavos === 0) return 'Gratuito';
  return `a partir de ${moeda.format(centavos / 100)}`;
}

export function CardEvento({ entrada }: { entrada: EntradaDaVitrine }) {
  const { evento, status, precoCentavos } = entrada;

  return (
    <Link
      href={`/events/${evento.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-line-strong hover:shadow-brand"
    >
      <CapaEvento evento={evento} />

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-xs font-semibold text-brand-ink">
          {diaDaSemana.format(evento.comecaEm)} · {hora.format(evento.comecaEm)}
        </p>

        <h3 className="display m-0 line-clamp-2 text-lg">{evento.nome}</h3>

        <p className="text-[13px] text-fg-muted">
          {localDeExibicao(evento)} · {rotuloModalidade(evento.modalidade)}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2.5 pt-4">
          <span className="text-[13px] font-semibold">{preco(precoCentavos)}</span>
          <SeloStatus status={status} />
        </div>
      </div>
    </Link>
  );
}
