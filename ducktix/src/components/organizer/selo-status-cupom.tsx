import { Badge } from '@/components/ui/badge';
import { type StatusCupom, rotuloStatusCupom } from '@/server/ticketing/domain/cupom';

/**
 * Selo de estado do cupom. Só "ativo" ganha o amarelo — é o único estado em
 * que o código realmente desconta alguma coisa. Os demais são cinzas: não
 * existe uma segunda cor de acento no sistema, e "expirado" não é um erro
 * que mereça a tinta de perigo.
 */
export function SeloStatusCupom({ status }: { status: StatusCupom }) {
  return (
    <Badge
      variant="outline"
      className={
        status === 'ativo'
          ? 'border-brand-ink/25 bg-brand-tint text-brand-ink'
          : 'border-line bg-surface-2 text-fg-muted'
      }
    >
      {rotuloStatusCupom(status)}
    </Badge>
  );
}
