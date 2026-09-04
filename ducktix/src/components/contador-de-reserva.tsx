'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

function formatarRestante(ms: number): string {
  const totalSegundos = Math.max(0, Math.floor(ms / 1000));
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${minutos}:${segundos.toString().padStart(2, '0')}`;
}

/**
 * Conta regressiva da reserva de 30min do pedido. Só mostra o relógio — não
 * cancela nada no cliente; se o tempo acabar, a próxima ação no servidor
 * (aplicar cupom, salvar participantes, confirmar) rejeita com o erro de
 * pedido expirado, e é isso que efetivamente barra a compra.
 */
export function ContadorDeReserva({ reservadoAte }: { reservadoAte: string | null }) {
  // Começa nulo de propósito: `Date.now()` durante o render dá um valor no
  // servidor e outro no cliente, e o relógio quebrava a hidratação da página
  // inteira. O primeiro valor real chega no efeito, já só no cliente.
  const [restanteMs, setRestanteMs] = useState<number | null>(null);
  const [avisou, setAvisou] = useState(false);

  useEffect(() => {
    if (!reservadoAte) return;
    const alvo = new Date(reservadoAte).getTime();
    const tique = () => {
      const restante = alvo - Date.now();
      setRestanteMs(restante);
      return restante;
    };
    tique();
    const id = setInterval(() => {
      if (tique() <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [reservadoAte]);

  useEffect(() => {
    if (restanteMs !== null && restanteMs <= 0 && !avisou) {
      setAvisou(true);
      toast.error('O tempo para finalizar este pedido expirou.');
    }
  }, [restanteMs, avisou]);

  if (!reservadoAte) return null;

  const expirado = restanteMs !== null && restanteMs <= 0;

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-4 py-2.5"
      role="timer"
    >
      <span className="text-[13px] text-fg-muted">
        {expirado ? 'Reserva expirada' : 'Tempo para finalizar'}
      </span>
      <span className={expirado ? 'font-semibold text-danger' : 'font-semibold tabular-nums text-fg'}>
        {restanteMs === null ? '--:--' : expirado ? '0:00' : formatarRestante(restanteMs)}
      </span>
    </div>
  );
}
