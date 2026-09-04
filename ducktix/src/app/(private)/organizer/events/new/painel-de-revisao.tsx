'use client';

import { PencilIcon } from 'lucide-react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { type DadosCriarEvento, enderecoParaTexto } from './schemas';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

const ROTULO_MODALIDADE = {
  presencial: 'Presencial',
  online: 'Online',
  hibrido: 'Híbrido',
} as const;

const ROTULO_FORMATO = {
  'ao-vivo': 'Ao vivo (livestream)',
  videoconferencia: 'Videoconferência',
  'desafio-virtual': 'Desafio virtual',
  'conteudo-digital': 'Conteúdo digital (sob demanda)',
} as const;

function formatarData(valor: string | undefined): string {
  if (!valor) return '—';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? '—' : dataHora.format(data);
}

/**
 * Revisão do que vai ser criado. O passo se chamava "Revisão e publicação" mas
 * só mostrava visibilidade e termos — o organizador publicava sem nunca rever
 * o que preencheu três passos atrás. Cada bloco leva de volta ao passo que o
 * originou.
 */
export function PainelDeRevisao({ irParaPasso }: { irParaPasso: (passo: number) => void }) {
  const { control } = useFormContext<DadosCriarEvento>();
  const valores = useWatch({ control });

  const textoDaDescricao = (valores.descricao ?? '').replace(/<[^>]+>/g, ' ').trim();
  const lotes = valores.lotes ?? [];

  const vagasTotais = lotes.reduce((soma, lote) => soma + (Number(lote?.vagas) || 0), 0);

  return (
    <div className="grid gap-3">
      <BlocoDeRevisao titulo="Informações gerais" aoEditar={() => irParaPasso(0)}>
        <Linha rotulo="Nome" valor={valores.nome?.trim() || '—'} />
        <Linha
          rotulo="Formato"
          valor={
            valores.modalidade
              ? `${ROTULO_MODALIDADE[valores.modalidade]}${
                  valores.formatoOnline ? ` · ${ROTULO_FORMATO[valores.formatoOnline]}` : ''
                }`
              : '—'
          }
        />
        <Linha rotulo="Categoria" valor={valores.categoria || '—'} />
        {valores.modalidade !== 'online' ? (
          <Linha
            rotulo="Local"
            valor={
              enderecoParaTexto({
                cep: valores.endereco?.cep,
                logradouro: valores.endereco?.logradouro,
                numero: valores.endereco?.numero,
                complemento: valores.endereco?.complemento,
                bairro: valores.endereco?.bairro,
                cidade: valores.endereco?.cidade,
                uf: valores.endereco?.uf,
              }) || '—'
            }
          />
        ) : null}
        <Linha rotulo="Início" valor={formatarData(valores.comecaEm)} />
        <Linha rotulo="Término" valor={formatarData(valores.terminaEm)} />
      </BlocoDeRevisao>

      <BlocoDeRevisao titulo="Mídia e descrição" aoEditar={() => irParaPasso(1)}>
        <Linha rotulo="Banner" valor={valores.imagemUrl ? 'Enviado' : 'Arte gerada pelo sistema'} />
        <Linha
          rotulo="Descrição"
          valor={
            textoDaDescricao
              ? `${textoDaDescricao.slice(0, 120)}${textoDaDescricao.length > 120 ? '…' : ''}`
              : '—'
          }
        />
      </BlocoDeRevisao>

      <BlocoDeRevisao
        titulo={`Lotes de ingresso · ${lotes.length}`}
        envolucro="div"
        aoEditar={() => irParaPasso(2)}
      >
        {lotes.length === 0 ? (
          <p className="text-[13px] text-fg-muted">Nenhum lote adicionado.</p>
        ) : (
          <>
            <ul className="grid gap-2">
              {lotes.map((lote, indice) => (
                <li
                  key={indice}
                  className="flex items-baseline justify-between gap-3 border-b border-line pb-2 last:border-b-0 last:pb-0"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {lote?.nome || `Lote ${indice + 1}`}
                    </span>
                    <span className="text-[13px] text-fg-muted">
                      {Number(lote?.vagas) || 0} vagas
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
                    {lote?.gratuito
                      ? 'Gratuito'
                      : moeda.format(Number(lote?.precoReais) || 0)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-fg-muted">
              Capacidade total: <span className="font-semibold text-fg">{vagasTotais}</span> vagas
            </p>
          </>
        )}
      </BlocoDeRevisao>
    </div>
  );
}

function BlocoDeRevisao({
  titulo,
  aoEditar,
  /** `dl` para os blocos de rótulo/valor; `div` para o de lotes, que traz lista. */
  envolucro: Envolucro = 'dl',
  children,
}: {
  titulo: string;
  aoEditar: () => void;
  envolucro?: 'dl' | 'div';
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-bg p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="m-0 text-sm font-semibold">{titulo}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={aoEditar}
          className="text-fg-muted hover:text-fg"
        >
          <PencilIcon aria-hidden="true" />
          Editar
        </Button>
      </div>
      <Envolucro className="mt-3 grid gap-2">{children}</Envolucro>
    </section>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-[13px] text-fg-muted">{rotulo}</dt>
      <dd className="text-sm font-medium break-words">{valor}</dd>
    </div>
  );
}
