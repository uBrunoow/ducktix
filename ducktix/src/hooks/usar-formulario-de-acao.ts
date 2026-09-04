'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import {
  type DefaultValues,
  type FieldValues,
  type Path,
  useForm,
} from 'react-hook-form';
import type { z } from 'zod';
import type { RespostaDaAcao } from '@/app/(public)/(auth)/acoes';

/**
 * Costura react-hook-form a uma Server Action. O cliente valida pelo mesmo
 * schema zod que o servidor reaplica; o que o servidor devolver como erro de
 * campo volta para o campo certo, e o que for erro de fluxo vira o erro `root`,
 * que o formulário desenha como alerta.
 *
 * O parâmetro de tipo é o formato dos campos, não o schema: passar o schema
 * como genérico faz o `Control` do RHF perder a resolução e todo `FormField`
 * deixa de tipar. Use `usarFormularioDeAcao<DadosLogin>({...})`.
 *
 * Sucesso não retorna — a ação redireciona.
 */
export function usarFormularioDeAcao<T extends FieldValues>({
  esquema,
  padroes,
  acao,
}: {
  esquema: z.ZodType<T>;
  padroes: DefaultValues<T>;
  acao: (dados: T) => Promise<RespostaDaAcao>;
}) {
  const [enviando, iniciarTransicao] = useTransition();

  const formulario = useForm<T>({
    resolver: zodResolver(esquema as never),
    defaultValues: padroes,
    mode: 'onTouched',
  });

  const enviar = formulario.handleSubmit((valores) => {
    iniciarTransicao(async () => {
      const resposta = await acao(valores as T);
      if (!resposta) return;

      if (resposta.campos) {
        for (const [campo, mensagem] of Object.entries(resposta.campos)) {
          formulario.setError(campo as Path<T>, { message: mensagem });
        }
      }
      if (resposta.erro) {
        formulario.setError('root', { message: resposta.erro });
      }
    });
  });

  return { formulario, enviar, enviando };
}
