import { Badge } from '@/components/ui/badge';
import type { StatusIngresso } from '@/server/participation/domain/ingresso';

const ROTULO: Record<StatusIngresso, string> = {
  emitido: 'Emitido',
  utilizado: 'Utilizado',
  cancelado: 'Cancelado',
};

/**
 * Selo de status do ingresso — distinto de `SeloStatus` (status comercial do
 * lote). "Cancelado" ganha a tinta de aviso, os outros ficam quietos: só o
 * estado que pede atenção do participante muda de cor.
 */
export function SeloStatusIngresso({ status }: { status: StatusIngresso }) {
  return (
    <Badge
      variant="outline"
      className={
        status === 'cancelado'
          ? 'border-danger/30 bg-danger-tint text-danger'
          : status === 'utilizado'
            ? 'border-line bg-surface-2 text-fg-muted'
            : 'border-brand-ink/25 bg-brand-tint text-brand-ink'
      }
    >
      {ROTULO[status]}
    </Badge>
  );
}
