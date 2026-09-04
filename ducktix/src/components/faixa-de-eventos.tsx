'use client';

import { useRef } from 'react';
import { CardEvento } from '@/components/card-evento';
import { TituloDeSecao } from '@/components/moldura';
import { Button } from '@/components/ui/button';
import type { Faixa } from '@/server/event/application/vitrine';

/** Faixa horizontal com rolagem por snap e controles de teclado/mouse. */
export function FaixaDeEventos({ faixa }: { faixa: Faixa }) {
  const trilho = useRef<HTMLDivElement>(null);

  function rolar(direcao: 1 | -1) {
    const el = trilho.current;
    if (!el) return;
    el.scrollBy({ left: direcao * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  return (
    <section aria-labelledby={`faixa-${faixa.id}`}>
      <TituloDeSecao
        id={`faixa-${faixa.id}`}
        titulo={faixa.titulo}
        descricao={faixa.descricao}
        acao={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => rolar(-1)}
              aria-label={`Ver eventos anteriores em ${faixa.titulo}`}
            >
              <SetaTrilho direcao="esquerda" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => rolar(1)}
              aria-label={`Ver mais eventos em ${faixa.titulo}`}
            >
              <SetaTrilho direcao="direita" />
            </Button>
          </div>
        }
      />

      <div className="relative mt-7 after:pointer-events-none after:absolute after:bottom-3 after:right-0 after:top-0 after:w-16 after:bg-gradient-to-r after:from-transparent after:to-bg">
        <div
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          ref={trilho}
        >
          {faixa.entradas.map((entrada) => (
            <div
              className="w-[76vw] flex-none snap-start sm:w-[272px]"
              key={entrada.evento.id}
            >
              <CardEvento entrada={entrada} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SetaTrilho({ direcao }: { direcao: 'esquerda' | 'direita' }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: direcao === 'esquerda' ? 'rotate(180deg)' : undefined }}
    >
      <path d="M3 8h9M8.5 4l4 4-4 4" />
    </svg>
  );
}
