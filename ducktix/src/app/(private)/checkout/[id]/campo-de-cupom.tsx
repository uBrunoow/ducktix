'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/ui/loading-button';
import { acaoAplicarCupom } from './acoes';
import { type DadosAplicarCupom, esquemaAplicarCupom } from './schemas';

/**
 * Cupom, dentro do resumo do pedido. Antes era uma seção solta no meio do
 * formulário de participantes — longe do total que ele altera, e ausente na
 * etapa de pagamento, onde o participante ainda pode querer aplicá-lo.
 */
export function CampoDeCupom({ pedidoId }: { pedidoId: string }) {
  const [enviando, iniciarTransicao] = useTransition();

  const formulario = useForm<DadosAplicarCupom>({
    resolver: zodResolver(esquemaAplicarCupom),
    defaultValues: { codigo: '' },
  });

  const aplicar = formulario.handleSubmit((valores) => {
    iniciarTransicao(async () => {
      const resposta = await acaoAplicarCupom(pedidoId, valores);
      if (resposta?.erro) {
        toast.error(resposta.erro);
      } else {
        toast.success('Cupom aplicado.');
        formulario.reset({ codigo: '' });
      }
    });
  });

  return (
    <Form {...formulario}>
      <div className="flex items-start gap-2">
        <FormField
          control={formulario.control}
          name="codigo"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input
                  placeholder="Cupom de desconto"
                  aria-label="Código do cupom de desconto"
                  className="h-9"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <LoadingButton
          type="button"
          variant="secondary"
          size="sm"
          className="h-9"
          loading={enviando}
          loadingText="Aplicando…"
          onClick={aplicar}
        >
          Aplicar
        </LoadingButton>
      </div>
    </Form>
  );
}
