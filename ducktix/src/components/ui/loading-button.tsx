import { Loader2Icon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import type { VariantProps } from 'class-variance-authority';

type PropsDoBotao = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

/**
 * Botão de ação assíncrona: enquanto `loading`, mostra spinner + o texto de
 * `loadingText` e fica desabilitado. Toda ação de envio (Server Action) usa
 * este componente em vez de desabilitar um `Button` manualmente, para manter
 * o mesmo feedback visual em todos os formulários.
 */
export function LoadingButton({
  loading,
  loadingText,
  children,
  disabled,
  ...props
}: PropsDoBotao & { loading: boolean; loadingText: string }) {
  return (
    <Button disabled={loading || disabled} {...props}>
      {loading ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : null}
      {loading ? loadingText : children}
    </Button>
  );
}
