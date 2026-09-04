'use client';

import Link from 'next/link';
import { useState } from 'react';
import { type DadosEsqueciSenha, esquemaEsqueciSenha } from '../schemas';
import { acaoSolicitarRedefinicao, type RespostaDaAcao } from '../acoes';
import { AlertaDeFormulario } from '@/components/alerta-de-formulario';
import { CascaConta, LinkDeConta } from '@/components/casca-conta';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { usarFormularioDeAcao } from '@/hooks/usar-formulario-de-acao';

export function FormularioEsqueciSenha() {
  const [recibo, setRecibo] = useState<RespostaDaAcao | null>(null);

  const { formulario, enviar, enviando } = usarFormularioDeAcao<DadosEsqueciSenha>({
    esquema: esquemaEsqueciSenha,
    padroes: { email: '' },
    acao: async (dados) => {
      const resposta = await acaoSolicitarRedefinicao(dados);
      if (resposta.enviado) setRecibo(resposta);
      return resposta;
    },
  });

  return (
    <CascaConta
      rotulo="Recuperar acesso"
      titulo="Vamos te ajudar a voltar."
      descricao={
        recibo
          ? undefined
          : 'Informe o e-mail da sua conta. Se ele existir, geramos um link de redefinição — válido por uma hora.'
      }
      rodape={
        <>
          Lembrou a senha? <LinkDeConta href="/login">Entrar</LinkDeConta>
        </>
      }
    >
      {recibo ? (
        <div
          role="status"
          className="rounded-lg border border-brand bg-brand-tint px-4 py-3.5 text-sm leading-[1.6] text-brand-ink"
        >
          <p className="m-0">
            Se este e-mail tiver uma conta, o link de redefinição foi gerado.
          </p>
          {recibo.linkDeTeste ? (
            <p className="m-0 mt-2.5 break-words">
              Sem envio de e-mail nesta fase acadêmica — o link aparece aqui só
              para teste:{' '}
              <Link
                href={recibo.linkDeTeste as '/reset-password'}
                className="font-semibold underline underline-offset-4"
              >
                {recibo.linkDeTeste}
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <AlertaDeFormulario mensagem={formulario.formState.errors.root?.message} />

          <Form {...formulario}>
            <form onSubmit={enviar} noValidate className="grid gap-5">
              <FormField
                control={formulario.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" size="lg" disabled={enviando} className="mt-1 w-full">
                {enviando ? 'Gerando link…' : 'Gerar link de redefinição'}
              </Button>
            </form>
          </Form>
        </>
      )}
    </CascaConta>
  );
}
