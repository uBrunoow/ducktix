'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CampoDeSenha } from '@/components/campo-de-senha';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { LoadingButton } from '@/components/ui/loading-button';
import { acaoAlterarSenha } from './acoes';
import { type DadosSenha, esquemaSenha } from './schemas';

export function DialogAlterarSenha() {
  const [aberto, setAberto] = useState(false);
  const [enviando, iniciarTransicao] = useTransition();

  const formulario = useForm<DadosSenha>({
    resolver: zodResolver(esquemaSenha),
    defaultValues: { senhaAtual: '', novaSenha: '', confirmacao: '' },
  });

  const enviar = formulario.handleSubmit((valores) => {
    iniciarTransicao(async () => {
      const resposta = await acaoAlterarSenha(valores);
      if (resposta?.erro) {
        toast.error(resposta.erro);
      } else {
        toast.success('Senha alterada.');
        formulario.reset({ senhaAtual: '', novaSenha: '', confirmacao: '' });
        setAberto(false);
      }
    });
  });

  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        setAberto(valor);
        if (!valor) formulario.reset({ senhaAtual: '', novaSenha: '', confirmacao: '' });
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" className="w-fit">
          Alterar senha
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>Informe a senha atual e a nova senha.</DialogDescription>
        </DialogHeader>

        <Form {...formulario}>
          <form onSubmit={enviar} noValidate className="grid gap-4">
            <FormField
              control={formulario.control}
              name="senhaAtual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha atual</FormLabel>
                  <FormControl>
                    <CampoDeSenha autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formulario.control}
              name="novaSenha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova senha</FormLabel>
                  <FormControl>
                    <CampoDeSenha autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formulario.control}
              name="confirmacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar nova senha</FormLabel>
                  <FormControl>
                    <CampoDeSenha autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <LoadingButton type="submit" loading={enviando} loadingText="Salvando…" className="mt-1">
              Alterar senha
            </LoadingButton>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
