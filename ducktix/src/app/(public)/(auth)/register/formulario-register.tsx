'use client';

import type { Route } from 'next';
import { type DadosRegistro, esquemaRegistro } from '../schemas';
import { acaoRegistrar } from '../acoes';
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
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { usarFormularioDeAcao } from '@/hooks/usar-formulario-de-acao';

const PAPEIS = [
  {
    valor: 'participante',
    titulo: 'Participante',
    descricao: 'Descubro eventos, compro ingressos e acompanho minhas inscrições.',
  },
  {
    valor: 'organizador',
    titulo: 'Organizador',
    descricao: 'Publico eventos, abro lotes e acompanho vendas e check-in.',
  },
] as const;

export function FormularioRegistrar({ next }: { next?: string }) {
  const { formulario, enviar, enviando } = usarFormularioDeAcao<DadosRegistro>({
    esquema: esquemaRegistro,
    padroes: { nome: '', email: '', senha: '', papel: 'participante' },
    acao: (dados) => acaoRegistrar(dados, next),
  });

  const linkLogin = (next ? `/login?next=${encodeURIComponent(next)}` : '/login') as Route;

  return (
    <CascaConta
      largura="ampla"
      rotulo="Criar conta"
      titulo="Comece pelo que você vai fazer aqui."
      descricao="A escolha muda o que você vê depois de entrar — dá para ter as duas coisas, mas uma conta começa por um papel."
      rodape={
        <>
          Já tem conta? <LinkDeConta href={linkLogin}>Entrar</LinkDeConta>
        </>
      }
    >
      <AlertaDeFormulario mensagem={formulario.formState.errors.root?.message} />

      <Form {...formulario}>
        <form onSubmit={enviar} noValidate className="grid gap-5">
          <FormField
            control={formulario.control}
            name="papel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Você é</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid gap-2.5 sm:grid-cols-2"
                  >
                    {PAPEIS.map((papel) => (
                      <FormLabel
                        key={papel.valor}
                        htmlFor={`papel-${papel.valor}`}
                        data-ativo={field.value === papel.valor ? 'true' : undefined}
                        className="flex h-full cursor-pointer items-start gap-3 rounded-lg border border-line bg-bg p-4 font-normal transition-colors duration-150 hover:border-line-strong data-[ativo]:border-brand data-[ativo]:bg-brand-tint"
                      >
                        <RadioGroupItem
                          id={`papel-${papel.valor}`}
                          value={papel.valor}
                          className="mt-0.5"
                        />
                        <span className="grid gap-1">
                          <span className="text-sm font-semibold">{papel.titulo}</span>
                          <span className="text-[13px] leading-[1.5] text-fg-muted">
                            {papel.descricao}
                          </span>
                        </span>
                      </FormLabel>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={formulario.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                  <CampoDeSenha autoComplete="new-password" {...field} />
                </FormControl>
                <FormDescription>Mínimo de 8 caracteres.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" disabled={enviando} className="mt-1 w-full">
            {enviando ? 'Criando conta…' : 'Criar conta'}
          </Button>
        </form>
      </Form>
    </CascaConta>
  );
}
