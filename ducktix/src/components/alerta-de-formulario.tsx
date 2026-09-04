import { OctagonXIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Erro de fluxo do formulário (credencial errada, token expirado). Erro de
 * campo não passa por aqui — ele mora sob o próprio campo, via FormMessage.
 */
export function AlertaDeFormulario({ mensagem }: { mensagem?: string }) {
  if (!mensagem) return null;

  return (
    <Alert
      role="alert"
      className="mb-5 border-danger/35 bg-danger-tint text-danger [&>svg]:text-danger"
    >
      <OctagonXIcon />
      <AlertDescription className="text-danger">{mensagem}</AlertDescription>
    </Alert>
  );
}
