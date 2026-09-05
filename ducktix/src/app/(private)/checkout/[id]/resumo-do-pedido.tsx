'use client';

import { TicketIcon } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { ContadorDeReserva } from '@/components/contador-de-reserva';
import type { Evento } from '@/server/event/domain/evento';
import type { Cupom } from '@/server/ticketing/domain/cupom';
import type { Pedido } from '@/server/ticketing/domain/pedido';
import { totalBrutoCentavos, totalComDescontoCentavos } from '@/server/ticketing/domain/pedido';
import { CampoDeCupom } from './campo-de-cupom';
import { acaoCancelarPedido } from './acoes';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface ItemComEvento {
  readonly item: Pedido['itens'][number];
  readonly evento: Evento | null;
  readonly loteNome: string;
}

export function ResumoDoPedido({
  pedido,
  cupom,
  itensComEvento,
}: {
  pedido: Pedido;
  cupom: Cupom | null;
  itensComEvento: readonly ItemComEvento[];
}) {
  const [cancelando, iniciarCancelamento] = useTransition();
  const bruto = totalBrutoCentavos(pedido);
  const total = totalComDescontoCentavos(pedido, cupom);
  const desconto = bruto - total;

  function cancelar() {
    iniciarCancelamento(async () => {
      const resposta = await acaoCancelarPedido(pedido.id);
      if (resposta?.erro) toast.error(resposta.erro);
    });
  }

  return (
    <aside className="grid gap-4 lg:sticky lg:top-24">
      <ContadorDeReserva
        reservadoAte={pedido.reservadoAte ? pedido.reservadoAte.toISOString() : null}
      />

      <div className="rounded-card border border-line bg-surface shadow-card">
        <div className="flex items-center gap-2 border-b border-line px-6 py-4">
          <TicketIcon className="size-4 text-fg-muted" strokeWidth={1.75} aria-hidden="true" />
          <h2 className="display m-0 text-base">Resumo do pedido</h2>
        </div>

        <div className="grid gap-3 px-6 py-4">
          {itensComEvento.map(({ item, evento, loteNome }) => (
            <div key={item.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {evento?.nome ?? 'Evento removido'}
                </p>
                <p className="text-[13px] text-fg-muted">
                  {loteNome} · {item.quantidade}
                  {item.quantidade === 1 ? ' ingresso' : ' ingressos'}
                </p>
              </div>
              <p className="whitespace-nowrap text-sm font-semibold tabular-nums">
                {moeda.format((item.quantidade * item.precoUnitarioCentavos) / 100)}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t border-line px-6 py-4">
          <CampoDeCupom pedidoId={pedido.id} />

          {cupom ? (
            <div className="mt-3 flex items-center justify-between gap-3 text-[13px]">
              <span className="text-fg-muted">
                Cupom <span className="font-semibold text-fg">{cupom.codigo}</span>
              </span>
              <span className="font-semibold tabular-nums text-brand-ink">
                −{moeda.format(desconto / 100)}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex items-baseline justify-between gap-3 border-t border-line px-6 py-4">
          <span className="text-sm font-medium">Total</span>
          <span className="display text-xl tabular-nums">{moeda.format(total / 100)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={cancelar}
        disabled={cancelando}
        className="justify-self-start text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline disabled:opacity-60"
      >
        {cancelando ? 'Cancelando…' : 'Cancelar pedido'}
      </button>
    </aside>
  );
}
