'use client';

import { type DadosRedefinicao, esquemaRedefinicao } from '../schemas';
import { acaoRedefinirSenha } from '../acoes';
import { AlertaDeFormulario } from '@/components/alerta-de-formulario';
import { CampoDeSenha } from '@/components/campo-de-senha';
import { CascaConta, LinkDeConta } from '@/components/casca-conta';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { usarFormularioDeAcao } from '@/hooks/usar-formulario-de-acao';

export function FormularioRedefinirSenha({ token }: { token: string }) {
  const { formulario, enviar, enviando } = usarFormularioDeAcao<DadosRedefinicao>({
    esquema: esquemaRedefinicao,
    padroes: { token, senha: '', confirmacao: '' },
    acao: acaoRedefinirSenha,
  });

  return (
    <CascaConta
      rotulo="Nova senha"
      titulo="Escolha uma senha nova."
      descricao="Depois de salvar, use a nova senha para entrar."
      rodape={
        <>
          Mudou de ideia? <LinkDeConta href="/login">Entrar</LinkDeConta>
        </>
      }
    >
      <AlertaDeFormulario mensagem={formulario.formState.errors.root?.message} />

      <Form {...formulario}>
        <form onSubmit={enviar} noValidate className="grid gap-5">
          <input type="hidden" {...formulario.register('token')} />

          <FormField
            control={formulario.control}
            name="senha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nova senha</FormLabel>
                <FormControl>
                  <CampoDeSenha autoComplete="new-password" {...field} />
                </FormControl>
                <FormDescription>Mínimo de 8 caracteres.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={formulario.control}
            name="confirmacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirme a nova senha</FormLabel>
                <FormControl>
                  <CampoDeSenha autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" disabled={enviando} className="mt-1 w-full">
            {enviando ? 'Salvando…' : 'Salvar nova senha'}
          </Button>
        </form>
      </Form>
    </CascaConta>
  );
}
