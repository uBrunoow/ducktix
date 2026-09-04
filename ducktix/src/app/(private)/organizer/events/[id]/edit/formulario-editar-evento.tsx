'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CameraIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState, useTransition } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { EditorDeTexto } from '@/components/editor-de-texto';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { acaoEditarEvento } from './acoes';
import { type DadosEditarEvento, esquemaEditarEvento } from './schemas';

const MODALIDADES = [
  {
    valor: 'presencial',
    titulo: 'Presencial',
    descricao: 'Acontece num local físico.',
  },
  {
    valor: 'online',
    titulo: 'Online',
    descricao: 'Só acontece pela internet.',
  },
  {
    valor: 'hibrido',
    titulo: 'Híbrido',
    descricao: 'Local físico e transmissão online.',
  },
] as const;

const FORMATOS_ONLINE = [
  { valor: 'ao-vivo', rotulo: 'Ao vivo (livestream)' },
  { valor: 'videoconferencia', rotulo: 'Videoconferência' },
  { valor: 'desafio-virtual', rotulo: 'Desafio virtual' },
  { valor: 'conteudo-digital', rotulo: 'Conteúdo digital (sob demanda)' },
] as const;

const TAMANHO_MAXIMO_IMAGEM_BYTES = 5 * 1024 * 1024;

export function FormularioEditarEvento({
  eventoId,
  categorias,
  valoresIniciais,
}: {
  eventoId: string;
  categorias: readonly string[];
  valoresIniciais: DadosEditarEvento;
}) {
  const [salvando, iniciarTransicao] = useTransition();
  const [imagemUrl, setImagemUrl] = useState<string | null>(
    valoresIniciais.imagemUrl ?? null,
  );

  const formulario = useForm<DadosEditarEvento>({
    resolver: zodResolver(esquemaEditarEvento),
    defaultValues: valoresIniciais,
  });

  const modalidade = useWatch({
    control: formulario.control,
    name: 'modalidade',
  });

  const selecionarImagem = useCallback(
    (arquivos: File[]) => {
      const arquivo = arquivos[0];
      if (!arquivo) return;
      if (arquivo.size > TAMANHO_MAXIMO_IMAGEM_BYTES) {
        toast.error('A imagem precisa ter no máximo 5 MB.');
        return;
      }
      const leitor = new FileReader();
      leitor.onload = () => {
        const dataUrl = leitor.result as string;
        setImagemUrl(dataUrl);
        formulario.setValue('imagemUrl', dataUrl, {
          shouldValidate: true,
          shouldDirty: true,
        });
      };
      leitor.readAsDataURL(arquivo);
    },
    [formulario],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: selecionarImagem,
    accept: { 'image/*': [] },
    maxFiles: 1,
    multiple: false,
  });

  function removerImagem() {
    setImagemUrl(null);
    formulario.setValue('imagemUrl', null, { shouldDirty: true });
  }

  const salvar = formulario.handleSubmit(
    (valores) => {
      iniciarTransicao(async () => {
        const resposta = await acaoEditarEvento(eventoId, valores);
        // Sucesso não retorna: a Server Action redireciona para o evento.
        if (resposta?.erro) toast.error(resposta.erro);
      });
    },
    () => toast.error('Revise os campos destacados antes de salvar.'),
  );

  return (
    <Form {...formulario}>
      <form onSubmit={salvar} noValidate className="grid w-full gap-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <section className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
            <h2 className="display m-0 text-base">Informações gerais</h2>

            <div className="mt-4 grid gap-4">
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
                            data-ativo={
                              field.value === m.valor ? 'true' : undefined
                            }
                            className="flex h-full cursor-pointer flex-col gap-1 rounded-lg border border-line bg-bg p-3 font-normal transition-colors duration-150 hover:border-line-strong data-[ativo]:border-brand data-[ativo]:bg-brand-tint"
                          >
                            <span className="flex items-center gap-2">
                              <RadioGroupItem
                                id={`modalidade-${m.valor}`}
                                value={m.valor}
                              />
                              <span className="text-sm font-semibold">
                                {m.titulo}
                              </span>
                            </span>
                            <span className="text-[12px] text-fg-muted">
                              {m.descricao}
                            </span>
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
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
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
                <FormField
                  control={formulario.control}
                  name="local"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Cidade · UF, ou o endereço completo"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
          </section>

          <section className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
            <h2 className="display m-0 text-base">Mídia e descrição</h2>

            <div className="mt-4 grid gap-5">
              <div>
                <FormLabel>Imagem / banner</FormLabel>
                <div
                  {...getRootProps()}
                  className={cn(
                    'mt-2 grid cursor-pointer place-items-center gap-2 rounded-lg border border-dashed border-line bg-bg p-6 text-center transition-colors duration-150 hover:border-line-strong focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                    isDragActive && 'border-brand bg-brand-tint',
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
                    <CameraIcon
                      className="size-6 text-fg-muted"
                      aria-hidden="true"
                    />
                  )}
                  <p className="text-[13px] text-fg-muted">
                    {isDragActive
                      ? 'Solte a imagem aqui…'
                      : imagemUrl
                        ? 'Clique ou arraste para trocar a imagem.'
                        : 'Clique ou arraste uma imagem — PNG ou JPG, até ~1MB.'}
                  </p>
                </div>
                {imagemUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removerImagem}
                    className="mt-2 text-fg-muted hover:text-fg"
                  >
                    <Trash2Icon aria-hidden="true" />
                    Remover imagem e voltar à arte gerada
                  </Button>
                ) : null}
              </div>

              <FormField
                control={formulario.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <EditorDeTexto
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>
        </div>

        <section className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
          <h2 className="display m-0 text-base">Visibilidade</h2>
          <FormField
            control={formulario.control}
            name="visibilidade"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid gap-2.5 sm:grid-cols-2"
                  >
                    {(
                      [
                        [
                          'publico',
                          'Público',
                          'Aparece na busca e nas listagens do site.',
                        ],
                        [
                          'nao-listado',
                          'Não listado',
                          'Só quem tem o link consegue ver e comprar.',
                        ],
                      ] as const
                    ).map(([valor, titulo, apoio]) => (
                      <FormLabel
                        key={valor}
                        htmlFor={`visibilidade-${valor}`}
                        data-ativo={field.value === valor ? 'true' : undefined}
                        className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-bg p-3 font-normal transition-colors duration-150 hover:border-line-strong data-[ativo]:border-brand data-[ativo]:bg-brand-tint"
                      >
                        <RadioGroupItem
                          id={`visibilidade-${valor}`}
                          value={valor}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block text-sm font-semibold">
                            {titulo}
                          </span>
                          <span className="text-[12px] text-fg-muted">
                            {apoio}
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
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <LoadingButton
            type="submit"
            size="lg"
            loading={salvando}
            loadingText="Salvando…"
          >
            Salvar alterações
          </LoadingButton>
          <Button asChild variant="ghost" type="button">
            <Link href={`/organizer/events/${eventoId}`}>Cancelar</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
