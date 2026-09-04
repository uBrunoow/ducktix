import { Cabecalho } from '@/components/cabecalho';
import { CapaEvento } from '@/components/capa-evento';
import { Faixa, Filete, Moldura } from '@/components/moldura';
import { PassosDoFluxo } from '@/components/passos-do-fluxo';
import { Rodape } from '@/components/rodape';
import { Button } from '@/components/ui/button';
import { localDeExibicao } from '@/server/event/domain/evento';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { nomeDeExibicao } from '@/server/participation/domain/ingresso';
import { drizzleIngressosRepository as memoriaIngressosRepository } from '@/server/participation/infrastructure/drizzle-ingressos';
import { drizzlePedidosRepository as pedidosRepository } from '@/server/ticketing/infrastructure/drizzle-pedidos';
import { CheckIcon, ChevronRight, MailIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const dataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' });
const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default async function PaginaDeAgradecimento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await sessaoAtual();
  if (!sessao) redirect(`/login?next=${encodeURIComponent(`/checkout/${id}/thank-you`)}`);

  const pedido = await pedidosRepository.buscarPorId(id);
  if (!pedido) notFound();
  if (pedido.participanteId !== sessao.usuarioId) notFound();
  if (pedido.status !== 'confirmado') redirect(`/checkout/${id}`);

  const itemIds = pedido.itens.map((item) => item.id);
  const ingressos = await memoriaIngressosRepository.listarPorItensDePedido(itemIds);

  const ingressosComEvento = await Promise.all(
    ingressos.map(async (ingresso) => {
      const evento = await catalogoPublicoRepository.buscarPorId(ingresso.eventoId);
      return { ingresso, evento: evento ?? null };
    }),
  );

  const quantidade = ingressosComEvento.length;
  const emailDeContato = pedido.participantes?.[0]?.email ?? null;

  return (
    <Moldura>
      <Cabecalho />
      <Faixa className="py-10 md:py-14">
        <PassosDoFluxo passos={['Participantes', 'Pagamento', 'Confirmação']} atual={2} />

        <div className="mt-10">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand text-brand-fg">
            <CheckIcon className="size-6" strokeWidth={2.5} aria-hidden="true" />
          </span>

          <h1 className="display mt-5 text-[clamp(1.75rem,3.6vw,2.5rem)] text-balance">
            Pedido confirmado
          </h1>
          <p className="mt-3 max-w-[58ch] text-[15px] leading-[1.6] text-fg-muted">
            {quantidade === 1
              ? 'Seu ingresso foi emitido e já está disponível com o QR code de entrada.'
              : `${quantidade} ingressos foram emitidos e já estão disponíveis com o QR code de entrada.`}
            {emailDeContato ? (
              <>
                {' '}
                Enviamos a confirmação para{' '}
                <span className="font-medium text-fg">{emailDeContato}</span>.
              </>
            ) : null}
          </p>
        </div>

        <ul className="mt-8 grid gap-2.5">
          {ingressosComEvento.map(({ ingresso, evento }) => (
            <li key={ingresso.id}>
              <Link
                href={`/my-tickets/${ingresso.id}`}
                className="group flex items-center gap-4 rounded-card border border-line bg-surface p-3 shadow-card transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-brand sm:gap-5 sm:p-4"
              >
                <div className="w-20 shrink-0 overflow-hidden rounded-[calc(var(--r-card)-0.4rem)]">
                  {evento ? (
                    <CapaEvento
                      evento={evento}
                      compacto
                      comKicker={false}
                      className="aspect-square"
                    />
                  ) : (
                    <div className="aspect-square bg-surface-2" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="display m-0 truncate text-base sm:text-lg">
                    {evento?.nome ?? 'Evento removido'}
                  </h2>
                  <p className="mt-0.5 truncate text-[13px] text-fg-muted">
                    {nomeDeExibicao(ingresso)}
                    {evento
                      ? ` · ${dataCurta.format(evento.comecaEm)} · ${hora.format(evento.comecaEm)} · ${localDeExibicao(evento)}`
                      : ''}
                  </p>
                </div>

                <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-brand-ink">
                  <span className="hidden sm:inline">Ver ingresso</span>
                  <ChevronRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/my-tickets">Ver meus ingressos</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/events">Descobrir outros eventos</Link>
          </Button>
        </div>

        <p className="mt-8 flex items-start gap-2 text-[13px] text-fg-muted">
          <MailIcon
            className="mt-0.5 size-3.5 shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          Apresente o QR code do ingresso na entrada do evento — ele fica sempre disponível em
          "Meus ingressos", não é preciso imprimir.
        </p>
      </Faixa>
      <Filete />
      <Rodape />
    </Moldura>
  );
}
