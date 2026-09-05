'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LoadingButton } from '@/components/ui/loading-button';
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

  if (bloqueado) return null;

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
      <Dialog
        open={aberto}
        onOpenChange={(valor) => {
          setAberto(valor);
          if (!valor) {
            setErro(null);
            setMotivo('');
          }
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            Solicitar cancelamento
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitar cancelamento</DialogTitle>
            <DialogDescription>
              A solicitação será enviada ao organizador do evento. O ingresso só será cancelado
              depois que ele aprovar o pedido.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <label
              className="grid gap-1.5 text-[13px] font-medium"
              htmlFor={`motivo-${ingressoId}`}
            >
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
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={enviando}>
                Voltar
              </Button>
            </DialogClose>
            <LoadingButton
              type="button"
              loading={enviando}
              loadingText="Enviando..."
              onClick={enviar}
            >
              Enviar solicitação
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
