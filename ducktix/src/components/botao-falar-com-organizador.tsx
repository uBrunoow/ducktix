'use client';

import { MessageCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/**
 * Mensageria entre participante e organizador não existe nesta fase — não
 * há domínio, não há caixa de entrada. Em vez de um link morto ou um botão
 * mudo, o clique dá uma resposta honesta sobre o que ainda não existe.
 */
export function BotaoFalarComOrganizador({ organizador }: { organizador: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() =>
        toast.info('Mensagens diretas chegam em um próximo ciclo.', {
          description: `Por enquanto, fale com ${organizador} pelos canais do evento.`,
        })
      }
    >
      <MessageCircleIcon />
      Falar com o organizador
    </Button>
  );
}
