'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { acaoLogin } from '../acoes';
import { type DadosLogin, esquemaLogin } from '../schemas';
import { CampoDeSenha } from '@/components/campo-de-senha';
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

export function FormularioLogin({
  redefinida,
  next,
}: {
  redefinida: boolean;
  next?: string;
}) {
  const { formulario, enviar, enviando } = usarFormularioDeAcao<DadosLogin>({
    esquema: esquemaLogin,
    padroes: { email: '', senha: '' },
    acao: (dados) => acaoLogin(dados, next),
    erroComoToast: true,
  });

  const linkRegistro = (
    next ? `/register?next=${encodeURIComponent(next)}` : '/register'
  ) as Route;

  return (
    <CascaConta
      rotulo="Entrar"
      titulo="Bem-vindo de volta."
      descricao="Entre para acompanhar seus ingressos, suas inscrições e os eventos que você organiza."
      rodape={
        <>
          Não tem conta? <LinkDeConta href={linkRegistro}>Criar conta</LinkDeConta>
        </>
      }
    >
      {redefinida ? (
        <p
          role="status"
          className="mb-5 rounded-lg border border-brand bg-brand-tint px-4 py-3 text-sm text-brand-ink"
        >
          Senha redefinida. Entre com a nova senha.
        </p>
      ) : null}

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

          <FormField
            control={formulario.control}
            name="senha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <CampoDeSenha autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
                <Link
                  href="/forgot-password"
                  className="justify-self-start text-[13px] text-brand-ink underline-offset-4 hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" disabled={enviando} className="mt-1 w-full">
            {enviando ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </Form>
    </CascaConta>
  );
}
