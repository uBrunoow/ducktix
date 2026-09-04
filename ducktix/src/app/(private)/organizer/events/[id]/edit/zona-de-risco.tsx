'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import type { StatusEvento } from '@/server/event/domain/evento';
import {
  acaoCancelarEvento,
  acaoDespublicarEvento,
  acaoExcluirEvento,
} from './acoes';

type Confirmacao = 'cancelar' | 'excluir' | null;

/**
 * Ações que mudam o destino do evento, não só os campos dele — por isso
 * vivem separadas do formulário, num bloco à parte que não se confunde com
 * "salvar alterações". Cancelar e excluir pedem confirmação porque nenhum
 * dos dois é o mesmo que desfazer uma edição.
 */
export function ZonaDeRisco({
  eventoId,
  status,
  podeExcluir,
}: {
  eventoId: string;
  status: StatusEvento;
  podeExcluir: boolean;
}) {
  const router = useRouter();
  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null);
  const [despublicando, iniciarDespublicar] = useTransition();
  const [processando, iniciarTransicao] = useTransition();

  function despublicar() {
    iniciarDespublicar(async () => {
      const resposta = await acaoDespublicarEvento(eventoId);
      if (resposta?.erro) {
        toast.error(resposta.erro);
      } else {
        toast.success('Evento despublicado — voltou a rascunho.');
        router.refresh();
      }
    });
  }

  function confirmar() {
    if (!confirmacao) return;
    iniciarTransicao(async () => {
      const resposta =
        confirmacao === 'cancelar'
          ? await acaoCancelarEvento(eventoId)
          : await acaoExcluirEvento(eventoId);

      if (resposta?.erro) {
        toast.error(resposta.erro);
        setConfirmacao(null);
        return;
      }
      // Excluir redireciona pela própria Server Action; cancelar fica na tela.
      if (confirmacao === 'cancelar') {
        toast.success('Evento cancelado.');
        router.refresh();
      }
      setConfirmacao(null);
    });
  }

  return (
    <section className="rounded-card border border-danger/25 bg-danger-tint/40 p-5 shadow-card sm:p-6">
      <h2 className="display m-0 text-base">Zona de risco</h2>
      <p className="mt-1 text-[13px] text-fg-muted">
        Essas ações mudam se e como o evento existe para o público — revise
        antes de confirmar.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm font-semibold">Despublicar</p>
          <p className="mt-1 text-[12px] text-fg-muted">
            Tira o evento da vitrine e volta para rascunho. Pode publicar de
            novo quando quiser.
          </p>
          <LoadingButton
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            loading={despublicando}
            loadingText="Despublicando…"
            disabled={status !== 'publicado'}
            onClick={despublicar}
          >
            {status === 'publicado' ? 'Despublicar' : 'Já não está publicado'}
          </LoadingButton>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm font-semibold">Cancelar evento</p>
          <p className="mt-1 text-[12px] text-fg-muted">
            Marca o evento como cancelado — pedidos e ingressos continuam
            existindo, o evento é que não vai mais acontecer.
          </p>
          <LoadingButton
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 border-danger/40 text-danger hover:bg-danger-tint hover:text-danger"
            loading={processando && confirmacao === 'cancelar'}
            loadingText="Cancelando…"
            disabled={status === 'cancelado'}
            onClick={() => setConfirmacao('cancelar')}
          >
            {status === 'cancelado' ? 'Já está cancelado' : 'Cancelar evento'}
          </LoadingButton>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm font-semibold">Excluir evento</p>
          <p className="mt-1 text-[12px] text-fg-muted">
            {podeExcluir
              ? 'Remove o evento por completo. Não dá pra desfazer.'
              : 'Este evento já tem ingresso vendido — cancele em vez de excluir.'}
          </p>
          <LoadingButton
            type="button"
            variant="destructive"
            size="sm"
            className="mt-3"
            loading={processando && confirmacao === 'excluir'}
            loadingText="Excluindo…"
            disabled={!podeExcluir}
            onClick={() => setConfirmacao('excluir')}
          >
            Excluir evento
          </LoadingButton>
        </div>
      </div>

      <Dialog
        open={confirmacao !== null}
        onOpenChange={(aberto) => !aberto && setConfirmacao(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmacao === 'excluir'
                ? 'Excluir este evento?'
                : 'Cancelar este evento?'}
            </DialogTitle>
            <DialogDescription>
              {confirmacao === 'excluir'
                ? 'O evento some do catálogo por completo. Esta ação não pode ser desfeita.'
                : 'O evento fica marcado como cancelado para todo mundo. Não existe um "reverter" — se precisar dele de volta, é preciso publicar um novo.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmacao(null)}
            >
              Voltar
            </Button>
            <LoadingButton
              type="button"
              variant="destructive"
              loading={processando}
              loadingText={
                confirmacao === 'excluir' ? 'Excluindo…' : 'Cancelando…'
              }
              onClick={confirmar}
            >
              {confirmacao === 'excluir'
                ? 'Excluir definitivamente'
                : 'Confirmar cancelamento'}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
