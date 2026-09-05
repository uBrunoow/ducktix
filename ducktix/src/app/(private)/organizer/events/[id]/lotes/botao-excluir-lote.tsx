'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { acaoExcluirLote } from './acoes';

export function BotaoExcluirLote({ eventoId, loteId }: { eventoId: string; loteId: string }) {
  const [excluindo, iniciarTransicao] = useTransition();

  function excluir() {
    if (!window.confirm('Excluir este lote? Esta ação não pode ser desfeita.')) return;
    iniciarTransicao(async () => {
      const resposta = await acaoExcluirLote(eventoId, loteId);
      if (resposta.erro) toast.error(resposta.erro);
      else toast.success('Lote excluído.');
    });
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={excluir} disabled={excluindo}>
      {excluindo ? 'Excluindo…' : 'Excluir'}
    </Button>
  );
}
