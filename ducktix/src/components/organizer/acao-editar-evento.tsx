'use client';

import { PencilIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/** Edição de evento é Ciclo 3 (backend). Resposta honesta em vez de rota morta. */
export function AcaoEditarEvento() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => toast.info('Edição de evento chega no próximo ciclo.')}
    >
      <PencilIcon />
      Editar
    </Button>
  );
}
