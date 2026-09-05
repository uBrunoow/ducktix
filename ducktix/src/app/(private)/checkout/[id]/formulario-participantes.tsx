'use client';

import { CamposDeEndereco } from '@/components/campos-de-endereco';
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
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon, ChevronDownIcon, UserIcon } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { acaoAvancarParaPagamento } from './acoes';
import { formatarCelular, formatarCpfCnpj } from '@/lib/formatadores';
import {
  type DadosEtapaParticipantes,
  esquemaEtapaParticipantes,
  metodosDePagamento,
} from './schemas';

const ROTULO_METODO: Record<(typeof metodosDePagamento)[number], string> = {
  cartao: 'Cartão de crédito',
  pix: 'Pix',
  boleto: 'Boleto',
};

const DESCRICAO_METODO: Record<(typeof metodosDePagamento)[number], string> = {
  cartao: 'Aprovação na hora.',
  pix: 'Confirmação em minutos.',
  boleto: 'Vence em 3 dias úteis.',
};

const participanteVazio = {
  nome: '',
  sobrenome: '',
  email: '',
  confirmarEmail: '',
  nomeCracha: '',
  celular: '',
  comoConheceu: '',
  linkedin: '',
  github: '',
  empresa: '',
  segmento: '',
  cargo: '',
  nivel: '',
};

export function FormularioParticipantes({
  pedidoId,
  totalDeUnidades,
  usuarioNome,
  usuarioEmail,
}: {
  pedidoId: string;
  totalDeUnidades: number;
  usuarioNome: string;
  usuarioEmail: string;
}) {
  const [continuando, iniciarTransicaoContinuar] = useTransition();
  // Com vários ingressos no mesmo pedido, os cartões viram uma parede de
  // campos idênticos. Um aberto por vez mantém o fluxo legível; os campos
  // continuam montados (só escondidos) para o react-hook-form não perder
  // valor nem mensagem de erro.
  const [aberto, setAberto] = useState(0);

  const formulario = useForm<DadosEtapaParticipantes>({
    resolver: zodResolver(esquemaEtapaParticipantes),
    defaultValues: {
      participantes: Array.from({ length: totalDeUnidades }, () => ({ ...participanteVazio })),
      cpf: '',
      endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
      metodoPagamento: 'pix',
    },
  });

  const { fields } = useFieldArray({ control: formulario.control, name: 'participantes' });
  const metodoPagamento = useWatch({ control: formulario.control, name: 'metodoPagamento' });
  const participantes = useWatch({ control: formulario.control, name: 'participantes' });

  const continuar = formulario.handleSubmit(
    (valores) => {
      iniciarTransicaoContinuar(async () => {
        const resposta = await acaoAvancarParaPagamento(pedidoId, valores);
        // Sucesso não retorna: a Server Action redireciona para o pagamento.
        if (resposta?.erro) toast.error(resposta.erro);
      });
    },
    (erros) => {
      // Um cartão fechado com erro é um erro que ninguém vê — abre o primeiro.
      const comErro = erros.participantes
        ? Object.keys(erros.participantes).find((chave) => /^\d+$/.test(chave))
        : undefined;
      if (comErro !== undefined) setAberto(Number(comErro));
      toast.error('Revise os campos destacados antes de continuar.');
    },
  );

  function preencherComMeusDados(indice: number) {
    const partesDoNome = usuarioNome.trim().split(/\s+/);
    const nome = partesDoNome[0] ?? '';
    const sobrenome = partesDoNome.slice(1).join(' ') || nome;
    formulario.setValue(`participantes.${indice}.nome`, nome, { shouldValidate: true });
    formulario.setValue(`participantes.${indice}.sobrenome`, sobrenome, { shouldValidate: true });
    formulario.setValue(`participantes.${indice}.email`, usuarioEmail, { shouldValidate: true });
    formulario.setValue(`participantes.${indice}.confirmarEmail`, usuarioEmail, { shouldValidate: true });
  }

  return (
    <Form {...formulario}>
      <form onSubmit={continuar} noValidate className="grid gap-10">
        <section>
          <h2 className="display m-0 text-lg">Participantes</h2>
          <p className="mt-1 text-[13px] text-fg-muted">
            {totalDeUnidades === 1
              ? 'Os dados de quem vai usar o ingresso.'
              : `Preencha os ${totalDeUnidades} ingressos deste pedido — um participante por ingresso.`}
          </p>

          <div className="mt-4 grid gap-2.5">
            {fields.map((field, indice) => {
              const estaAberto = aberto === indice;
              const dados = participantes?.[indice];
              const nomeCompleto = [dados?.nome, dados?.sobrenome].filter(Boolean).join(' ').trim();
              const completo = Boolean(nomeCompleto && dados?.email);
              const temErro = Boolean(formulario.formState.errors.participantes?.[indice]);

              return (
                <fieldset
                  key={field.id}
                  className={cn(
                    'overflow-hidden rounded-card border bg-surface shadow-card transition-colors duration-150',
                    temErro ? 'border-danger/40' : 'border-line',
                  )}
                >
                  <legend className="sr-only">Participante {indice + 1}</legend>

                  <button
                    type="button"
                    onClick={() => setAberto(estaAberto ? -1 : indice)}
                    aria-expanded={estaAberto}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-surface-2/60"
                  >
                    <span
                      className={cn(
                        'grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold',
                        completo
                          ? 'border-brand bg-brand-tint text-brand-ink'
                          : 'border-line bg-surface-2 text-fg-muted',
                      )}
                    >
                      {completo ? (
                        <CheckIcon className="size-3.5" aria-hidden="true" />
                      ) : (
                        indice + 1
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {nomeCompleto || `Participante ${indice + 1}`}
                      </span>
                      <span className="block truncate text-[13px] text-fg-muted">
                        {dados?.email || 'Dados não preenchidos'}
                      </span>
                    </span>

                    <ChevronDownIcon
                      className={cn(
                        'size-4 shrink-0 text-fg-muted transition-transform duration-200',
                        estaAberto && 'rotate-180',
                      )}
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </button>

                  <div className={cn('border-t border-line p-4', !estaAberto && 'hidden')}>
                    <div className="mb-4 flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => preencherComMeusDados(indice)}
                      >
                        <UserIcon aria-hidden="true" />
                        Este ingresso é para mim
                      </Button>
                    </div>

                    <div className="grid gap-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FormField
                          control={formulario.control}
                          name={`participantes.${indice}.nome`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome</FormLabel>
                              <FormControl>
                                <Input autoComplete="given-name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={formulario.control}
                          name={`participantes.${indice}.sobrenome`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sobrenome</FormLabel>
                              <FormControl>
                                <Input autoComplete="family-name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FormField
                          control={formulario.control}
                          name={`participantes.${indice}.email`}
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
                          name={`participantes.${indice}.confirmarEmail`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirme o e-mail</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FormField
                          control={formulario.control}
                          name={`participantes.${indice}.nomeCracha`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome pro crachá (opcional)</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={formulario.control}
                          name={`participantes.${indice}.celular`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Celular</FormLabel>
                              <FormControl>
                                <Input
                                  type="tel"
                                  autoComplete="tel"
                                  placeholder="(00) 00000-0000"
                                  maxLength={15}
                                  {...field}
                                  onChange={(e) => field.onChange(formatarCelular(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={formulario.control}
                        name={`participantes.${indice}.comoConheceu`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Como você conheceu este evento? (opcional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Instagram, indicação, e-mail…" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <details className="group mt-4 rounded-lg border border-line bg-surface-2 p-3">
                      <summary className="flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-fg-muted marker:content-none">
                        Dados profissionais (opcional)
                        <ChevronDownIcon
                          className="size-3.5 transition-transform duration-200 group-open:rotate-180"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      </summary>
                      <div className="mt-3 grid gap-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <FormField
                            control={formulario.control}
                            name={`participantes.${indice}.linkedin`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>LinkedIn</FormLabel>
                                <FormControl>
                                  <Input placeholder="linkedin.com/in/…" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={formulario.control}
                            name={`participantes.${indice}.github`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>GitHub</FormLabel>
                                <FormControl>
                                  <Input placeholder="github.com/…" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={formulario.control}
                          name={`participantes.${indice}.empresa`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Onde você trabalha</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <FormField
                            control={formulario.control}
                            name={`participantes.${indice}.segmento`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Segmento da empresa</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={formulario.control}
                            name={`participantes.${indice}.cargo`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cargo</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={formulario.control}
                          name={`participantes.${indice}.nivel`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nível de experiência</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </details>
                  </div>
                </fieldset>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="display m-0 text-lg">Dados de cobrança</h2>
          <p className="mt-1 text-[13px] text-fg-muted">
            Só do comprador — não é preciso repetir para cada participante.
          </p>
          <div className="mt-4 grid gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
            <FormField
              control={formulario.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      maxLength={18}
                      {...field}
                      onChange={(e) => field.onChange(formatarCpfCnpj(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <CamposDeEndereco prefix="endereco." />
          </div>
        </section>

        <section>
          <h2 className="display m-0 text-lg">Meio de pagamento</h2>
          <FormField
            control={formulario.control}
            name="metodoPagamento"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex flex-col gap-2"
                  >
                    {metodosDePagamento.map((valor) => (
                      <FormLabel
                        key={valor}
                        htmlFor={`metodo-${valor}`}
                        data-ativo={metodoPagamento === valor ? 'true' : undefined}
                        className="flex items-start justify-start xxxxxxxxxh-full cursor-pointer flex-col gap-1 rounded-card border border-line bg-surface p-4 font-normal shadow-card transition-colors duration-150 hover:border-line-strong data-[ativo]:border-brand data-[ativo]:bg-brand-tint"
                      >
                        <span className="flex gap-2.5">
                          <RadioGroupItem id={`metodo-${valor}`} value={valor} />
                          <span className="text-sm font-semibold">{ROTULO_METODO[valor]}</span>
                        </span>
                        <span className="pl-[1.6rem] text-[12px] text-fg-muted">
                          {DESCRICAO_METODO[valor]}
                        </span>
                      </FormLabel>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <LoadingButton
          type="submit"
          size="lg"
          loading={continuando}
          loadingText="Salvando…"
          className="w-full sm:w-fit"
        >
          Continuar para pagamento
        </LoadingButton>
      </form>
    </Form>
  );
}
