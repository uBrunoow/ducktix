'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CameraIcon, MinusIcon, PlusIcon } from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';
import { PassosDoFluxo } from '@/components/passos-do-fluxo';
import { PainelDeRevisao } from './painel-de-revisao';
import { PreviaDoEvento } from './previa-do-evento';
import { useDropzone } from 'react-dropzone';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { CamposDeEndereco } from '@/components/campos-de-endereco';
import { EditorDeTexto } from '@/components/editor-de-texto';
import { Checkbox } from '@/components/ui/checkbox';
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
import { LoadingButton } from '@/components/ui/loading-button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { acaoCriarEvento } from './acoes';
import { enviarImagemParaBlob } from '@/lib/enviar-imagem-para-blob';
import { CAMPOS_DO_PASSO, type DadosCriarEvento, esquemaCriarEvento } from './schemas';
import { formatarReais, reaisDoCampo } from '@/lib/formatadores';

const MODALIDADES = [
  { valor: 'presencial', titulo: 'Presencial', descricao: 'Acontece num local físico.' },
  { valor: 'online', titulo: 'Online', descricao: 'Só acontece pela internet.' },
  { valor: 'hibrido', titulo: 'Híbrido', descricao: 'Local físico e transmissão online.' },
] as const;

const FORMATOS_ONLINE = [
  { valor: 'ao-vivo', rotulo: 'Ao vivo (livestream)' },
  { valor: 'videoconferencia', rotulo: 'Videoconferência' },
  { valor: 'desafio-virtual', rotulo: 'Desafio virtual' },
  { valor: 'conteudo-digital', rotulo: 'Conteúdo digital (sob demanda)' },
] as const;

const PASSOS = ['Informações', 'Mídia', 'Lotes', 'Revisão'] as const;

const TAMANHO_MAXIMO_IMAGEM_BYTES = 5 * 1024 * 1024;

const DESCRICAO_DO_PASSO: Record<number, { titulo: string; apoio: string }> = {
  0: { titulo: 'Informações gerais', apoio: 'Onde, quando e de que tipo é o evento.' },
  1: { titulo: 'Mídia e descrição', apoio: 'A capa e o texto que o participante lê antes de comprar.' },
  2: { titulo: 'Lotes de ingresso', apoio: 'Preço, vagas e prazo de cada lote à venda.' },
  3: { titulo: 'Revisão e publicação', apoio: 'Confira tudo antes de colocar no ar.' },
};

export function FormularioCriarEvento({
  organizadorPadrao,
  categorias,
}: {
  organizadorPadrao: string;
  categorias: readonly string[];
}) {
  const [passo, setPasso] = useState(0);
  const [avancando, setAvancando] = useState(false);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [enviandoImagem, iniciarTransicaoImagem] = useTransition();
  const [salvandoRascunho, iniciarTransicaoRascunho] = useTransition();
  const [publicando, iniciarTransicaoPublicar] = useTransition();

  const formulario = useForm<DadosCriarEvento>({
    resolver: zodResolver(esquemaCriarEvento),
    defaultValues: {
      nome: '',
      modalidade: 'presencial',
      formatoOnline: undefined,
      categoria: '',
      endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
      comecaEm: '',
      terminaEm: '',
      imagemUrl: null,
      descricao: '',
      visibilidade: 'publico',
      lotes: [{ nome: 'Lote 1', gratuito: false, precoReais: 0, vagas: 100, iniciaEm: '', encerraEm: '' }],
      aceiteTermos: false as unknown as true,
    },
  });

  const { fields, append, remove } = useFieldArray({ control: formulario.control, name: 'lotes' });
  const modalidade = useWatch({ control: formulario.control, name: 'modalidade' });

  const selecionarImagem = useCallback(
    (arquivos: File[]) => {
      const arquivo = arquivos[0];
      if (!arquivo) return;
      if (arquivo.size > TAMANHO_MAXIMO_IMAGEM_BYTES) {
        toast.error('A imagem precisa ter no máximo 5 MB.');
        return;
      }
      iniciarTransicaoImagem(async () => {
        try {
          const url = await enviarImagemParaBlob(arquivo);
          setImagemUrl(url);
          formulario.setValue('imagemUrl', url, { shouldValidate: true });
        } catch (erro) {
          toast.error(erro instanceof Error ? erro.message : 'Não foi possível enviar a imagem.');
        }
      });
    },
    [formulario],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: selecionarImagem,
    accept: { 'image/*': [] },
    maxFiles: 1,
    multiple: false,
    disabled: enviandoImagem,
  });

  async function irParaProximoPasso() {
    setAvancando(true);
    const campos = CAMPOS_DO_PASSO[passo];
    const valido = await formulario.trigger(campos as never);
    setAvancando(false);
    if (valido) {
      setPasso((p) => Math.min(p + 1, PASSOS.length - 1));
    } else {
      toast.error('Revise os campos destacados antes de continuar.');
    }
  }

  function voltarPasso() {
    setPasso((p) => Math.max(p - 1, 0));
  }

  const salvarComoRascunho = formulario.handleSubmit((valores) => {
    iniciarTransicaoRascunho(async () => {
      const resposta = await acaoCriarEvento(valores, false);
      if (resposta?.erro) toast.error(resposta.erro);
      // Sucesso não retorna: a Server Action redireciona para a lista.
    });
  });

  const publicarAgora = formulario.handleSubmit((valores) => {
    iniciarTransicaoPublicar(async () => {
      const resposta = await acaoCriarEvento(valores, true);
      if (resposta?.erro) toast.error(resposta.erro);
      // Sucesso não retorna: a Server Action redireciona para a página pública.
    });
  });

  const enviando = salvandoRascunho || publicando;

  return (
    <Form {...formulario}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10">
        <div className="min-w-0">
          <PassosDoFluxo passos={PASSOS} atual={passo} />

          <div className="mt-7">
            <h2 className="display m-0 text-lg">{DESCRICAO_DO_PASSO[passo].titulo}</h2>
            <p className="mt-1 text-[13px] text-fg-muted">{DESCRICAO_DO_PASSO[passo].apoio}</p>
          </div>

          <form
            onSubmit={(e) => e.preventDefault()}
            noValidate
            className="mt-4 rounded-card border border-line bg-surface p-5 shadow-card sm:p-7"
          >
          {passo === 0 ? (
            <div className="grid gap-4">
              <FormField
                control={formulario.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do evento</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <p className="text-[13px] text-fg-muted">
                Organizador: <span className="font-medium text-fg">{organizadorPadrao || 'você'}</span>
              </p>

              <FormField
                control={formulario.control}
                name="modalidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Formato do evento</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="grid gap-2.5 sm:grid-cols-3"
                      >
                        {MODALIDADES.map((m) => (
                          <FormLabel
                            key={m.valor}
                            htmlFor={`modalidade-${m.valor}`}
                            data-ativo={field.value === m.valor ? 'true' : undefined}
                            className="flex h-full cursor-pointer flex-col gap-1 rounded-lg border border-line bg-bg p-3 font-normal transition-colors duration-150 hover:border-line-strong data-[ativo]:border-brand data-[ativo]:bg-brand-tint"
                          >
                            <span className="flex items-center gap-2">
                              <RadioGroupItem id={`modalidade-${m.valor}`} value={m.valor} />
                              <span className="text-sm font-semibold">{m.titulo}</span>
                            </span>
                            <span className="text-[12px] text-fg-muted">{m.descricao}</span>
                          </FormLabel>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {modalidade !== 'presencial' ? (
                <FormField
                  control={formulario.control}
                  name="formatoOnline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formato da parte online</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o formato" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FORMATOS_ONLINE.map((f) => (
                            <SelectItem key={f.valor} value={f.valor}>
                              {f.rotulo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <FormField
                control={formulario.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categorias.map((categoria) => (
                          <SelectItem key={categoria} value={categoria}>
                            {categoria}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {modalidade !== 'online' ? (
                <div>
                  <FormLabel>Local</FormLabel>
                  <div className="mt-2">
                    <CamposDeEndereco prefix="endereco." />
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={formulario.control}
                  name="comecaEm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Início</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={formulario.control}
                  name="terminaEm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Término</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ) : null}

          {passo === 1 ? (
            <div className="grid gap-6">
              <div>
                <FormLabel>Imagem / banner</FormLabel>
                <div
                  {...getRootProps()}
                  className={cn(
                    'mt-2 grid cursor-pointer place-items-center gap-2 rounded-lg border border-dashed border-line bg-bg p-6 text-center transition-colors duration-150 hover:border-line-strong focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                    isDragActive && 'border-brand bg-brand-tint',
                    enviandoImagem && 'cursor-not-allowed opacity-70',
                  )}
                >
                  <input {...getInputProps()} />
                  {imagemUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagemUrl}
                      alt="Prévia da imagem do evento"
                      className="max-h-40 rounded-lg object-cover shadow-card"
                    />
                  ) : (
                    <CameraIcon className="size-6 text-fg-muted" aria-hidden="true" />
                  )}
                  <p className="text-[13px] text-fg-muted">
                    {isDragActive
                      ? 'Solte a imagem aqui…'
                      : imagemUrl
                        ? 'Clique ou arraste para trocar a imagem.'
                        : 'Clique ou arraste uma imagem — PNG ou JPG, até ~1MB.'}
                  </p>
                </div>
              </div>

              <FormField
                control={formulario.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <EditorDeTexto value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ) : null}

          {passo === 2 ? (
            <div className="grid gap-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] text-fg-muted">Adicione ao menos um lote de ingresso.</p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-[13px]"
                  onClick={() => append({ nome: `Lote ${fields.length + 1}`, gratuito: false, precoReais: 0, vagas: 100, iniciaEm: '', encerraEm: '' })}
                >
                  <PlusIcon className="size-3.5" aria-hidden="true" />
                  Adicionar lote
                </Button>
              </div>

              {fields.map((field, indice) => (
                <fieldset key={field.id} className="grid gap-3 rounded-lg border border-line bg-bg p-4">
                  <div className="flex items-center justify-between gap-2">
                    <legend className="px-1 text-sm font-semibold">Lote {indice + 1}</legend>
                    {fields.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => remove(indice)}
                        aria-label={`Remover lote ${indice + 1}`}
                        className="text-fg-muted hover:text-fg"
                      >
                        <MinusIcon className="size-3.5" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>

                  <FormField
                    control={formulario.control}
                    name={`lotes.${indice}.nome`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do lote</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={formulario.control}
                    name={`lotes.${indice}.gratuito`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Este lote é</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              data-ativo={!field.value ? 'true' : undefined}
                              onClick={() => field.onChange(false)}
                              className="rounded-lg border border-line bg-bg p-2.5 text-sm font-medium text-fg-muted outline-none transition-colors duration-150 hover:border-line-strong focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[ativo]:border-brand data-[ativo]:bg-brand-tint data-[ativo]:text-fg"
                            >
                              Pago
                            </button>
                            <button
                              type="button"
                              data-ativo={field.value ? 'true' : undefined}
                              onClick={() => {
                                field.onChange(true);
                                formulario.setValue(`lotes.${indice}.precoReais`, 0, { shouldValidate: true });
                              }}
                              className="rounded-lg border border-line bg-bg p-2.5 text-sm font-medium text-fg-muted outline-none transition-colors duration-150 hover:border-line-strong focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[ativo]:border-brand data-[ativo]:bg-brand-tint data-[ativo]:text-fg"
                            >
                              Gratuito
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    {!formulario.watch(`lotes.${indice}.gratuito`) ? (
                      <FormField
                        control={formulario.control}
                        name={`lotes.${indice}.precoReais`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preço (R$)</FormLabel>
                            <FormControl>
                              <Input
                                inputMode="decimal"
                                placeholder="0,00"
                                {...field}
                                value={formatarReais(field.value as number)}
                                onChange={(e) => field.onChange(reaisDoCampo(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : null}
                    <FormField
                      control={formulario.control}
                      name={`lotes.${indice}.vagas`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vagas</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} {...field} value={field.value as number} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Janela de venda do lote. Fica num bloco próprio porque
                      as duas datas se leem em par — e é o que permite
                      programar a fila inteira ("Lote 2 abre quando o Lote 1
                      fecha") já na criação do evento. */}
                  <div className="grid gap-3 rounded-lg border border-line bg-surface p-3 sm:grid-cols-2">
                    <p className="text-[13px] font-medium text-fg-muted sm:col-span-2">
                      Janela de venda
                    </p>
                    <FormField
                      control={formulario.control}
                      name={`lotes.${indice}.iniciaEm`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Abre em (opcional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormDescription>
                            Em branco: vende assim que o evento for publicado.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={formulario.control}
                      name={`lotes.${indice}.encerraEm`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Encerra em (opcional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormDescription>
                            Em branco: vende até o evento começar.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </fieldset>
              ))}
            </div>
          ) : null}

          {passo === 3 ? (
            <div className="grid gap-6">
              <PainelDeRevisao irParaPasso={setPasso} />

              <div>
                <FormLabel>Visibilidade</FormLabel>
                <FormField
                  control={formulario.control}
                  name="visibilidade"
                  render={({ field }) => (
                    <FormItem className="mt-2">
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="grid gap-2.5 sm:grid-cols-2"
                        >
                          <FormLabel
                            htmlFor="visibilidade-publico"
                            data-ativo={field.value === 'publico' ? 'true' : undefined}
                            className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-bg p-3 font-normal transition-colors duration-150 hover:border-line-strong data-[ativo]:border-brand data-[ativo]:bg-brand-tint"
                          >
                            <RadioGroupItem id="visibilidade-publico" value="publico" className="mt-0.5" />
                            <span>
                              <span className="block text-sm font-semibold">Público</span>
                              <span className="text-[12px] text-fg-muted">
                                Aparece na busca e nas listagens do site.
                              </span>
                            </span>
                          </FormLabel>
                          <FormLabel
                            htmlFor="visibilidade-nao-listado"
                            data-ativo={field.value === 'nao-listado' ? 'true' : undefined}
                            className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-bg p-3 font-normal transition-colors duration-150 hover:border-line-strong data-[ativo]:border-brand data-[ativo]:bg-brand-tint"
                          >
                            <RadioGroupItem id="visibilidade-nao-listado" value="nao-listado" className="mt-0.5" />
                            <span>
                              <span className="block text-sm font-semibold">Não listado</span>
                              <span className="text-[12px] text-fg-muted">
                                Só quem tem o link consegue ver e comprar.
                              </span>
                            </span>
                          </FormLabel>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={formulario.control}
                name="aceiteTermos"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 rounded-lg border border-line bg-bg p-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
                    </FormControl>
                    <div>
                      <FormLabel className="font-normal">
                        Li e concordo com os Termos de Uso e a Política da Ducktix, e assumo a
                        responsabilidade pelas informações deste evento.
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>
          ) : null}
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={voltarPasso}
              disabled={passo === 0 || enviando}
            >
              Voltar
            </Button>

            {passo < PASSOS.length - 1 ? (
              <LoadingButton
                type="button"
                onClick={irParaProximoPasso}
                loading={avancando}
                loadingText="Verificando…"
              >
                Continuar
              </LoadingButton>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <LoadingButton
                  type="button"
                  variant="secondary"
                  onClick={salvarComoRascunho}
                  loading={salvandoRascunho}
                  loadingText="Salvando…"
                  disabled={enviando}
                >
                  Salvar como rascunho
                </LoadingButton>
                <LoadingButton
                  type="button"
                  onClick={publicarAgora}
                  loading={publicando}
                  loadingText="Publicando…"
                  disabled={enviando}
                >
                  Publicar agora
                </LoadingButton>
              </div>
            )}
          </div>
        </div>

        <PreviaDoEvento />
      </div>
    </Form>
  );
}
