'use client';

import { PencilIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormularioLote } from './formulario-lote';
import { BotaoExcluirLote } from './botao-excluir-lote';
import type { DadosLoteDoEvento } from './schemas';

export function DialogEditarLote({
  eventoId,
  loteId,
  valores,
}: {
  eventoId: string;
  loteId: string;
  valores: DadosLoteDoEvento;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="text-brand-ink">
          <PencilIcon aria-hidden="true" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar lote</DialogTitle>
          <DialogDescription>
            Atualize os dados deste lote enquanto ele ainda não possui vendas.
          </DialogDescription>
        </DialogHeader>
        <FormularioLote eventoId={eventoId} loteId={loteId} valores={valores} />
        <BotaoExcluirLote eventoId={eventoId} loteId={loteId} />
      </DialogContent>
    </Dialog>
  );
}
