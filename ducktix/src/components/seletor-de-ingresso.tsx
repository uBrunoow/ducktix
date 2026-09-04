'use client';

import { MinusIcon, PlusIcon } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/ui/loading-button';
import type { Evento, Lote } from '@/server/event/domain/evento';
import { loteEstaAberto } from '@/server/event/domain/evento';
import { acaoAdicionarAoCarrinho } from '@/app/(public)/events/[slug]/acoes';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Nenhum pedido único pode levar mais ingressos do que isso, mesmo com estoque de sobra. */
const LIMITE_POR_PEDIDO = 8;

export function SeletorDeIngresso({ evento, agora }: { evento: Evento; agora: Date }) {
  const abertos = evento.lotes.filter((lote) => loteEstaAberto(lote, agora));
  const [escolhido, setEscolhido] = useState<string | null>(abertos[0]?.id ?? null);
  const [quantidade, setQuantidade] = useState(1);
  const [enviando, iniciarTransicao] = useTransition();

  if (abertos.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-bg px-4 py-3.5 text-sm text-fg-muted">
        Não há lotes disponíveis para este evento no momento.
      </p>
    );
  }

  const lote = abertos.find((l) => l.id === escolhido) ?? abertos[0];
  const maximo = Math.min(LIMITE_POR_PEDIDO, lote.vagas - lote.vendidos);

  function escolherLote(l: Lote) {
    setEscolhido(l.id);
    setQuantidade((atual) => Math.min(atual, Math.min(LIMITE_POR_PEDIDO, l.vagas - l.vendidos)));
  }

  function continuar() {
    iniciarTransicao(async () => {
      const resposta = await acaoAdicionarAoCarrinho({
        eventoId: evento.id,
        loteId: lote.id,
        quantidade,
      });
      // Sucesso não retorna: a Server Action redireciona para o checkout.
      if (resposta?.erro) toast.error(resposta.erro);
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2.5" role="radiogroup" aria-label="Tipo de ingresso">
        {abertos.map((l) => (
          <OpcaoDeLote
            key={l.id}
            lote={l}
            selecionado={l.id === lote.id}
            onSelecionar={() => escolherLote(l)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-sm font-medium">Quantidade</span>
        <div className="flex items-center gap-3 rounded-full border border-line bg-bg p-1">
          <button
            type="button"
            onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
            disabled={quantidade <= 1}
            aria-label="Diminuir quantidade"
            className="grid size-7 cursor-pointer place-items-center rounded-full text-fg transition-colors duration-150 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MinusIcon className="size-3.5" aria-hidden="true" />
          </button>
          <span className="w-4 text-center text-sm font-semibold tabular-nums" aria-live="polite">
            {quantidade}
          </span>
          <button
            type="button"
            onClick={() => setQuantidade((q) => Math.min(maximo, q + 1))}
            disabled={quantidade >= maximo}
            aria-label="Aumentar quantidade"
            className="grid size-7 cursor-pointer place-items-center rounded-full text-fg transition-colors duration-150 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PlusIcon className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-fg-muted">Total</p>
          <p className="display text-2xl">
            {lote.precoCentavos === 0
              ? 'Gratuito'
              : moeda.format((lote.precoCentavos * quantidade) / 100)}
          </p>
        </div>
        <LoadingButton size="lg" onClick={continuar} loading={enviando} loadingText="Adicionando…">
          Continuar
        </LoadingButton>
      </div>
    </div>
  );
}

function OpcaoDeLote({
  lote,
  selecionado,
  onSelecionar,
}: {
  lote: Lote;
  selecionado: boolean;
  onSelecionar: () => void;
}) {
  const restam = lote.vagas - lote.vendidos;
  const escasso = restam / lote.vagas <= 0.2;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selecionado}
      onClick={onSelecionar}
      data-ativo={selecionado ? 'true' : undefined}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-bg p-4 text-left transition-colors duration-150 hover:border-line-strong data-[ativo]:border-brand data-[ativo]:bg-brand-tint"
    >
      <span className="grid gap-1">
        <span className="text-sm font-semibold">{lote.nome}</span>
        <span className="text-[13px] text-fg-muted">
          {escasso ? `Últimas ${restam} vagas` : `${restam} vagas disponíveis`}
        </span>
      </span>
      <span className="display text-lg">
        {lote.precoCentavos === 0 ? 'Grátis' : moeda.format(lote.precoCentavos / 100)}
      </span>
    </button>
  );
}
