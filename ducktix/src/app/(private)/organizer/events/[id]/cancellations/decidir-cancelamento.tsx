'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { acaoResolverCancelamento } from './acoes';

export function DecidirCancelamento({
  eventoId,
  cancelamentoId,
}: {
  eventoId: string;
  cancelamentoId: string;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  function decidir(decisao: 'aprovado' | 'negado') {
    setErro(null);
    startTransition(async () => {
      const resultado = await acaoResolverCancelamento(eventoId, cancelamentoId, decisao);
      if (!resultado.ok) setErro(resultado.erro ?? 'Não foi possível resolver a solicitação.');
    });
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {erro ? <span className="w-full text-right text-xs text-destructive">{erro}</span> : null}
      <Button type="button" size="sm" variant="outline" disabled={enviando} onClick={() => decidir('negado')}>
        Recusar
      </Button>
      <Button type="button" size="sm" disabled={enviando} onClick={() => decidir('aprovado')}>
        Aceitar
      </Button>
    </div>
  );
}
