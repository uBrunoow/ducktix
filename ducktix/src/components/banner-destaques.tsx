'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Seta } from '@/components/marca';
import { CapaEvento } from '@/components/capa-evento';
import { SeloStatus } from '@/components/selo-status';
import { Button } from '@/components/ui/button';
import type { EntradaDaVitrine } from '@/server/event/application/vitrine';
import { localDeExibicao, rotuloModalidade } from '@/server/event/domain/evento';

const dataLonga = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

const INTERVALO = 7000;

/** Banner rotativo de destaques. Pausa no hover, no foco e sob reduced-motion. */
export function BannerDestaques({
  destaques,
}: {
  destaques: readonly EntradaDaVitrine[];
}) {
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);

  const avancar = useCallback(
    (passo: number) =>
      setAtual((i) => (i + passo + destaques.length) % destaques.length),
    [destaques.length],
  );

  useEffect(() => {
    if (pausado || destaques.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => avancar(1), INTERVALO);
    return () => window.clearInterval(id);
  }, [pausado, avancar, destaques.length]);

  if (destaques.length === 0) return null;
  const entrada = destaques[atual];
  const { evento } = entrada;

  return (
    <section
      className="grid overflow-hidden rounded-card border border-line bg-surface shadow-card min-[960px]:grid-cols-[1.15fr_1fr]"
      aria-roledescription="carrossel"
      aria-label="Eventos em destaque"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') avancar(1);
        if (e.key === 'ArrowLeft') avancar(-1);
      }}
    >
      <CapaEvento
        evento={evento}
        destaque
        className="aspect-[16/10] p-7 min-[960px]:aspect-auto min-[960px]:h-full min-[960px]:min-h-[400px]"
      />

      <div className="flex flex-col p-6 md:p-9" aria-live="polite">
        <p className="text-xs font-semibold text-fg-muted">
          Em destaque · {atual + 1} de {destaques.length}
        </p>

        <h2 className="display m-0 mt-3 text-[clamp(1.6rem,3vw,2.4rem)] text-balance">
          {evento.nome}
        </h2>

        <dl className="mt-6 grid gap-4">
          <Linha rotulo="Quando">
            {dataLonga.format(evento.comecaEm)} · {hora.format(evento.comecaEm)}
          </Linha>
          <Linha rotulo="Onde">
            {localDeExibicao(evento)} · {rotuloModalidade(evento.modalidade)}
          </Linha>
          <Linha rotulo="Organização">{evento.organizador}</Linha>
        </dl>

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-8">
          <Button asChild>
            <Link href={`/events/${evento.slug}`}>
              Ver ingressos
              <Seta />
            </Link>
          </Button>
          <SeloStatus status={entrada.status} />
        </div>

        <div className="mt-7 flex gap-2">
          {destaques.map((d, i) => (
            <button
              key={d.evento.id}
              type="button"
              onClick={() => setAtual(i)}
              aria-label={`Ver destaque ${i + 1}: ${d.evento.nome}`}
              aria-current={i === atual ? 'true' : undefined}
              data-ativo={i === atual ? 'true' : undefined}
              className="h-1.5 w-9 cursor-pointer rounded-full border-0 bg-line-strong p-0 transition-colors duration-200 hover:bg-fg-muted data-[ativo]:bg-brand"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-fg-muted">{rotulo}</dt>
      <dd className="m-0 mt-1 text-sm font-medium">{children}</dd>
    </div>
  );
}
