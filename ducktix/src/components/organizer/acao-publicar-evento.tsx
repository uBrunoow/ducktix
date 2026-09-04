'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { acaoPublicarEvento } from '@/app/(private)/organizer/events/acoes';
import { LoadingButton } from '@/components/ui/loading-button';

export function AcaoPublicarEvento({ eventoId }: { eventoId: string }) {
  const [publicando, iniciarTransicao] = useTransition();

  function publicar() {
    iniciarTransicao(async () => {
      const resposta = await acaoPublicarEvento(eventoId);
      if (resposta?.erro) {
        toast.error(resposta.erro);
      } else {
        toast.success('Evento publicado.');
      }
    });
  }

  return (
    <LoadingButton
      type="button"
      size="sm"
      loading={publicando}
      loadingText="Publicando…"
      onClick={publicar}
    >
      Publicar
    </LoadingButton>
  );
}
