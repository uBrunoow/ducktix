import { PainelArte, digerir } from '@/components/painel-arte';
import type { Evento } from '@/server/event/domain/evento';

const diaDoMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' });
const mesCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

/** Capa de evento: a data em escala de cartaz. É informação, não enfeite. */
export function CapaEvento({
  evento,
  destaque = false,
  compacto = false,
  comKicker = true,
  className,
}: {
  evento: Evento;
  destaque?: boolean;
  /** Miniatura de lista (~80px) — data em escala fixa pequena, sem clamp por viewport. */
  compacto?: boolean;
  /** `false` para tamanhos pequenos (miniatura em lista) onde o chip de categoria não cabe. */
  comKicker?: boolean;
  className?: string;
}) {
  const semente = digerir(evento.slug);

  return (
    <PainelArte
      semente={semente}
      emAmarelo={semente % 4 === 0}
      imagemUrl={evento.imagemUrl}
      kicker={comKicker ? evento.categoria : undefined}
      className={className}
    >
      <span className="display relative flex items-baseline gap-1.5 text-sm uppercase">
        <strong
          className={`display ${
            destaque
              ? 'text-[clamp(3.5rem,9vw,6.5rem)]'
              : compacto
                ? 'text-2xl'
                : 'text-[clamp(2.25rem,4.5vw,3rem)]'
          }`}
        >
          {diaDoMes.format(evento.comecaEm)}
        </strong>
        {!compacto ? mesCurto.format(evento.comecaEm).replace('.', '') : null}
      </span>
    </PainelArte>
  );
}
