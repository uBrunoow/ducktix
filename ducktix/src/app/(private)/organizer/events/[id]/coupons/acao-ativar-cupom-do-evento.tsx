'use client';

import { PowerIcon } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/ui/loading-button';
import { acaoDefinirCupomAtivoNoEvento } from './acoes';

/**
 * Liga/desliga um cupom. Desativar é reversível e não apaga histórico — por
 * isso é um botão comum, não uma ação destrutiva com confirmação.
 */
export function AcaoAtivarCupomDoEvento({
  eventoId,
  cupomId,
  ativo,
}: {
  eventoId: string;
  cupomId: string;
  ativo: boolean;
}) {
  const [enviando, iniciarTransicao] = useTransition();

  function alternar() {
    iniciarTransicao(async () => {
      const resposta = await acaoDefinirCupomAtivoNoEvento(eventoId, cupomId, !ativo);
      if (resposta?.erro) {
        toast.error(resposta.erro);
      } else {
        toast.success(ativo ? 'Cupom desativado.' : 'Cupom ativado.');
      }
    });
  }

  return (
    <LoadingButton
      type="button"
      variant={ativo ? 'secondary' : 'default'}
      loading={enviando}
      loadingText={ativo ? 'Desativando…' : 'Ativando…'}
      onClick={alternar}
    >
      <PowerIcon aria-hidden="true" />
      {ativo ? 'Desativar cupom' : 'Ativar cupom'}
    </LoadingButton>
  );
}
