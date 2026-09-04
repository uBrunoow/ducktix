'use client';

import { CheckIcon, CopyIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/**
 * Copia um código para a área de transferência e confirma na própria etiqueta
 * do botão por dois segundos — o toast sozinho some rápido demais para quem
 * já está com o app do banco aberto na outra mão.
 */
export function BotaoCopiar({
  valor,
  rotulo = 'Copiar código',
  rotuloCopiado = 'Copiado',
  className,
}: {
  valor: string;
  rotulo?: string;
  rotuloCopiado?: string;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const id = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(id);
  }, [copiado]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
    } catch {
      toast.error('Não foi possível copiar. Selecione o código e copie manualmente.');
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={copiar} className={className}>
      {copiado ? (
        <CheckIcon aria-hidden="true" />
      ) : (
        <CopyIcon aria-hidden="true" />
      )}
      {copiado ? rotuloCopiado : rotulo}
    </Button>
  );
}
