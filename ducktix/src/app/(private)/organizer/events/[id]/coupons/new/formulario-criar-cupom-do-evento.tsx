'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Route } from 'next';
import Link from 'next/link';
import { useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
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
import { LoadingButton } from '@/components/ui/loading-button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { acaoCriarCupomDoEvento } from '../acoes';
import {
  type DadosCriarCupomDoEvento,
  esquemaCriarCupomDoEvento,
} from '../schemas';

export function FormularioCriarCupomDoEvento({
  eventoId,
}: {
  eventoId: string;
}) {
  const [salvando, iniciarTransicao] = useTransition();

  const formulario = useForm<DadosCriarCupomDoEvento>({
    resolver: zodResolver(esquemaCriarCupomDoEvento),
    defaultValues: {
      codigo: '',
      tipoDesconto: 'percentual',
      valor: 10,
      validoDe: '',
      validoAte: '',
      limiteDeUso: 100,
    },
  });

  const tipoDesconto = useWatch({
    control: formulario.control,
    name: 'tipoDesconto',
  });

  const salvar = formulario.handleSubmit((valores) => {
    iniciarTransicao(async () => {
      const resposta = await acaoCriarCupomDoEvento(eventoId, valores);
      // Sucesso não retorna: a Server Action redireciona para a lista.
      if (resposta?.erro) toast.error(resposta.erro);
    });
  });

  return (
    <Form {...formulario}>
      <form onSubmit={salvar} noValidate className="grid w-full gap-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <section className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
            <h2 className="display m-0 text-base">Código e desconto</h2>

            <div className="mt-4 grid gap-4">
              <FormField
                control={formulario.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="PROMO10"
                        autoComplete="off"
                        className="font-mono uppercase"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={formulario.control}
                name="tipoDesconto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de desconto</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="grid gap-2.5 sm:grid-cols-2"
                      >
                        {(
                          [
                            [
                              'percentual',
                              'Percentual',
                              'Uma fatia do total do pedido.',
                            ],
                            [
                              'fixo',
                              'Valor fixo',
                              'Abate um valor em reais do total.',
                            ],
                          ] as const
                        ).map(([valor, titulo, apoio]) => (
                          <FormLabel
                            key={valor}
                            htmlFor={`tipo-${valor}`}
                            data-ativo={
                              field.value === valor ? 'true' : undefined
                            }
                            className="flex h-full cursor-pointer flex-col gap-1 rounded-lg border border-line bg-bg p-3 font-normal transition-colors duration-150 hover:border-line-strong data-[ativo]:border-brand data-[ativo]:bg-brand-tint"
                          >
                            <span className="flex items-center gap-2">
                              <RadioGroupItem
                                id={`tipo-${valor}`}
                                value={valor}
                              />
                              <span className="text-sm font-semibold">
                                {titulo}
                              </span>
                            </span>
                            <span className="text-[12px] text-fg-muted">
                              {apoio}
                            </span>
                          </FormLabel>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={formulario.control}
                  name="valor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {tipoDesconto === 'percentual'
                          ? 'Percentual (%)'
                          : 'Valor (R$)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={tipoDesconto === 'percentual' ? 1 : 0.01}
                          max={tipoDesconto === 'percentual' ? 100 : undefined}
                          step={tipoDesconto === 'percentual' ? 1 : 0.01}
                          {...field}
                          value={field.value as number}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={formulario.control}
                  name="limiteDeUso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite de usos</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          value={field.value as number}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </section>

          <section className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
            <h2 className="display m-0 text-base">Período de validade</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <FormField
                control={formulario.control}
                name="validoDe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Válido a partir de</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formulario.control}
                name="validoAte"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Válido até</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <LoadingButton
            type="submit"
            size="lg"
            loading={salvando}
            loadingText="Criando…"
          >
            Criar cupom
          </LoadingButton>
          <Button asChild variant="ghost" type="button">
            <Link href={`/organizer/events/${eventoId}/coupons` as Route}>
              Cancelar
            </Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
