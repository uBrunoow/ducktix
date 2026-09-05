'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/ui/loading-button';
import { formatarReais, reaisDoCampo } from '@/lib/formatadores';
import { acaoAdicionarLote, acaoAtualizarLote } from './acoes';
import { type DadosLoteDoEvento, esquemaLoteDoEvento } from './schemas';

export function FormularioLote({
  eventoId,
  loteId,
  valores,
}: {
  eventoId: string;
  loteId?: string;
  valores?: Partial<DadosLoteDoEvento>;
}) {
  const [salvando, iniciarTransicao] = useTransition();
  const formulario = useForm<DadosLoteDoEvento>({
    resolver: zodResolver(esquemaLoteDoEvento),
    defaultValues: {
      nome: valores?.nome ?? '',
      precoReais: valores?.precoReais ?? 0,
      vagas: valores?.vagas ?? 100,
      iniciaEm: valores?.iniciaEm ?? '',
      encerraEm: valores?.encerraEm ?? '',
    },
  });

  const salvar = formulario.handleSubmit((dados) => {
    iniciarTransicao(async () => {
      const resposta = loteId
        ? await acaoAtualizarLote(eventoId, loteId, dados)
        : await acaoAdicionarLote(eventoId, dados);
      if (resposta?.erro) toast.error(resposta.erro);
    });
  });

  return (
    <Form {...formulario}>
      <form onSubmit={salvar} noValidate className="grid gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
        <FormField control={formulario.control} name="nome" render={({ field }) => (
          <FormItem><FormLabel>Nome do lote</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField control={formulario.control} name="precoReais" render={({ field }) => (
            <FormItem><FormLabel>Preço (R$)</FormLabel><FormControl><Input inputMode="decimal" {...field} value={formatarReais(field.value as number)} onChange={(e) => field.onChange(reaisDoCampo(e.target.value))} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={formulario.control} name="vagas" render={({ field }) => (
            <FormItem><FormLabel>Vagas</FormLabel><FormControl><Input type="number" min={1} {...field} value={field.value as number} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField control={formulario.control} name="iniciaEm" render={({ field }) => (
            <FormItem><FormLabel>Início das vendas</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={formulario.control} name="encerraEm" render={({ field }) => (
            <FormItem><FormLabel>Fim das vendas</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <LoadingButton type="submit" loading={salvando} loadingText="Salvando…">{loteId ? 'Salvar lote' : 'Adicionar lote'}</LoadingButton>
      </form>
    </Form>
  );
}
