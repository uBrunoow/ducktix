import { Badge } from '@/components/ui/badge';
import { type StatusLote, rotuloStatus } from '@/server/event/domain/evento';

/**
 * Selo de status comercial. "Último lote" é o único que ganha o amarelo cheio:
 * é o estado que pede ação. Os outros ficam quietos.
 */
export function SeloStatus({ status }: { status: StatusLote }) {
  if (status === 'a-venda') return null;

  return (
    <Badge
      variant="outline"
      className={
        status === 'ultimo-lote'
          ? 'border-brand bg-brand text-brand-fg'
          : 'border-line bg-surface-2 text-fg-muted'
      }
    >
      {rotuloStatus(status)}
    </Badge>
  );
}
