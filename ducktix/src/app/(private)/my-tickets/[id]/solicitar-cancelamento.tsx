'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { acaoSolicitarCancelamento } from '../acoes';

export function SolicitarCancelamento({
  ingressoId,
  pedidoId,
  bloqueado,
}: {
  ingressoId: string;
  pedidoId: string;
  bloqueado: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  if (bloqueado && !aberto) return null;

  function enviar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await acaoSolicitarCancelamento(ingressoId, pedidoId, motivo);
      if (!resultado.ok) {
        setErro(resultado.erro ?? 'Não foi possível solicitar o cancelamento.');
        return;
      }
      setAberto(false);
      setMotivo('');
    });
  }

  return (
    <div className="mt-5 border-t border-line pt-5">
      {!aberto ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setAberto(true)}>
          Solicitar cancelamento
        </Button>
      ) : (
        <div className="grid gap-3">
          <label className="grid gap-1.5 text-[13px] font-medium" htmlFor={`motivo-${ingressoId}`}>
            Motivo (opcional)
            <textarea
              id={`motivo-${ingressoId}`}
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              maxLength={200}
              rows={3}
              className="resize-none rounded-[var(--r-control)] border border-line bg-bg px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              placeholder="Conte ao organizador por que deseja cancelar."
            />
          </label>
          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={enviando} onClick={enviar}>
              {enviando ? 'Enviando...' : 'Enviar solicitação'}
            </Button>
            <Button type="button" variant="ghost" disabled={enviando} onClick={() => setAberto(false)}>
              Voltar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
