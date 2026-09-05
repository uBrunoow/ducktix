'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CameraIcon } from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { enviarImagemParaBlob } from '@/lib/enviar-imagem-para-blob';
import { formatarCpfCnpj } from '@/lib/formatadores';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/ui/loading-button';
import { acaoAtualizarFoto, acaoAtualizarPerfil } from './acoes';
import { type DadosPerfil, esquemaPerfil } from './schemas';

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

export function FormularioPerfil({
  nomeAtual,
  emailAtual,
  cpfCnpjAtual,
  fotoAtual,
}: {
  nomeAtual: string;
  emailAtual: string;
  cpfCnpjAtual: string;
  fotoAtual: string | null;
}) {
  const [enviando, iniciarTransicao] = useTransition();
  const [enviandoFoto, iniciarTransicaoFoto] = useTransition();
  const [foto, setFoto] = useState(fotoAtual);

  const formulario = useForm<DadosPerfil>({
    resolver: zodResolver(esquemaPerfil),
    defaultValues: { nome: nomeAtual, email: emailAtual, cpfCnpj: cpfCnpjAtual },
  });

  const selecionarFoto = useCallback((arquivos: File[]) => {
    const arquivo = arquivos[0];
    if (!arquivo) return;

    iniciarTransicaoFoto(async () => {
      try {
        const url = await enviarImagemParaBlob(arquivo, 'profile-photos');
        const resposta = await acaoAtualizarFoto(url);
        if (resposta?.erro) {
          toast.error(resposta.erro);
        } else {
          setFoto(url);
          toast.success('Foto atualizada.');
        }
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : 'Não foi possível enviar a foto.');
      }
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: selecionarFoto,
    accept: { 'image/*': [] },
    maxFiles: 1,
    multiple: false,
    disabled: enviandoFoto,
    noClick: false,
  });

  const enviar = formulario.handleSubmit((valores) => {
    iniciarTransicao(async () => {
      const resposta = await acaoAtualizarPerfil(valores);
      if (resposta?.erro) {
        toast.error(resposta.erro);
      } else {
        toast.success('Dados atualizados.');
      }
    });
  });

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-4">
        <div
          {...getRootProps()}
          aria-label="Alterar foto de perfil (clique ou arraste uma imagem)"
          className={cn(
            'relative cursor-pointer rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
            enviandoFoto && 'cursor-not-allowed opacity-70',
          )}
        >
          <input {...getInputProps()} />
          <Avatar size="lg" className={cn('size-16 transition-opacity', isDragActive && 'opacity-60')}>
            <AvatarImage src={foto ?? undefined} alt="" />
            <AvatarFallback className="text-base">{iniciais(nomeAtual)}</AvatarFallback>
          </Avatar>
          <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full border border-line bg-surface text-fg-muted shadow-card">
            <CameraIcon className="size-3.5" aria-hidden="true" />
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold">Foto de perfil</p>
          <p className="text-[13px] text-fg-muted">
            {isDragActive ? 'Solte a imagem aqui…' : 'Clique ou arraste uma imagem — PNG ou JPG, até ~1MB.'}
          </p>
        </div>
      </div>

      <Form {...formulario}>
        <form onSubmit={enviar} noValidate className="grid gap-4">
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
            name="cpfCnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF ou CNPJ</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    maxLength={18}
                    placeholder="000.000.000-00"
                    {...field}
                    onChange={(e) => field.onChange(formatarCpfCnpj(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <LoadingButton type="submit" loading={enviando} loadingText="Salvando…" className="w-fit">
            Salvar alterações
          </LoadingButton>
        </form>
      </Form>
    </div>
  );
}
