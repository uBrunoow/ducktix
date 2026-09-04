import Link from 'next/link';
import { Seta } from '@/components/marca';
import { Rotulo } from '@/components/moldura';
import { Button } from '@/components/ui/button';

export function Heroi({ totalDeEventos }: { totalDeEventos: number }) {
  return (
    <section className="relative overflow-hidden px-5 pb-20 pt-16 md:px-10 md:pb-28 md:pt-24">
      <div
        aria-hidden="true"
        className="dotgrid pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-45 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000,transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-56 left-[18%] size-[420px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--brand), transparent 65%)' }}
      />

      <div className="relative max-w-[54rem]">
        <Rotulo>{totalDeEventos} eventos com ingressos abertos agora</Rotulo>

        <h1 className="display mt-6 text-[clamp(2.4rem,5.6vw,3.9rem)] leading-[1.22] text-balance">
          Publique seu evento.
          <br />
          <span className="marca-texto">A gente vende os ingressos.</span>
        </h1>

        <p className="mt-6 max-w-[54ch] text-lg text-fg-muted">
          Lotes, pedidos, pagamento e check-in no mesmo lugar. Quem organiza vê
          a ocupação em tempo real; quem compra vê exatamente o que ainda está
          disponível.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
          <Button asChild size="lg">
            <Link href="/events">
              Explorar eventos
              <Seta />
            </Link>
          </Button>
          <Link
            href="/organizer/events/new"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-brand-ink"
          >
            Sou organizador
            <Seta className="size-4 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
