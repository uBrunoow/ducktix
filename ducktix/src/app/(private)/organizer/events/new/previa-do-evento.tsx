'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { PainelArte, digerir } from '@/components/painel-arte';
import { gerarSlug } from '@/server/event/domain/evento';
import { type DadosCriarEvento, enderecoParaTexto } from './schemas';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const diaDaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const diaDoMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' });
const mesCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

const ROTULO_MODALIDADE = {
  presencial: 'Presencial',
  online: 'Online',
  hibrido: 'Híbrido',
} as const;

/**
 * Prévia ao vivo do card que vai aparecer na vitrine. O organizador está
 * preenchendo campos soltos; isto mostra o resultado deles montado, com a
 * mesma arte gerada e a mesma tipografia do `CardEvento` real, para que a
 * decisão de nome, categoria e capa aconteça com o resultado à vista.
 */
export function PreviaDoEvento() {
  const { control } = useFormContext<DadosCriarEvento>();
  const valores = useWatch({ control });

  const nome = valores.nome?.trim() || 'Nome do evento';
  const semente = digerir(gerarSlug(nome));
  const comecaEm = valores.comecaEm ? new Date(valores.comecaEm) : null;
  const dataValida = comecaEm !== null && !Number.isNaN(comecaEm.getTime());

  const local =
    valores.modalidade === 'online'
      ? 'Transmissão ao vivo'
      : enderecoParaTexto({
          cep: valores.endereco?.cep,
          logradouro: valores.endereco?.logradouro,
          numero: valores.endereco?.numero,
          complemento: valores.endereco?.complemento,
          bairro: valores.endereco?.bairro,
          cidade: valores.endereco?.cidade,
          uf: valores.endereco?.uf,
        }) || 'Local a definir';

  // Um lote pago com preço ainda em zero é preço não definido, não "gratuito"
  // — só `gratuito: true` significa entrada franca.
  const precosDefinidos = (valores.lotes ?? []).flatMap((lote) => {
    if (lote?.gratuito) return [0];
    const preco = Number(lote?.precoReais);
    return Number.isFinite(preco) && preco > 0 ? [preco] : [];
  });
  const menorPreco = precosDefinidos.length > 0 ? Math.min(...precosDefinidos) : null;

  return (
    <div className="lg:sticky lg:top-8">
      <p className="text-xs font-medium text-fg-muted">Prévia na vitrine</p>

      <div className="mt-3 overflow-hidden rounded-card border border-line bg-surface shadow-card">
        {valores.imagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={valores.imagemUrl}
            alt=""
            className="aspect-video w-full object-cover"
          />
        ) : (
          <PainelArte
            semente={semente}
            emAmarelo={semente % 4 === 0}
            kicker={valores.categoria || undefined}
          >
            <span className="display relative flex items-baseline gap-2 text-sm uppercase">
              <strong className="display text-[clamp(2.25rem,4.5vw,3rem)]">
                {dataValida ? diaDoMes.format(comecaEm) : '00'}
              </strong>
              {dataValida ? mesCurto.format(comecaEm).replace('.', '') : '—'}
            </span>
          </PainelArte>
        )}

        <div className="flex flex-col gap-1.5 p-4">
          <p className="text-xs font-semibold text-brand-ink">
            {dataValida
              ? `${diaDaSemana.format(comecaEm)} · ${hora.format(comecaEm)}`
              : 'Data a definir'}
          </p>

          <h3 className="display m-0 line-clamp-2 text-lg">{nome}</h3>

          <p className="text-[13px] text-fg-muted">
            {local} · {ROTULO_MODALIDADE[valores.modalidade ?? 'presencial']}
          </p>

          <div className="mt-2 pt-2">
            <span className="text-[13px] font-semibold">
              {menorPreco === null
                ? 'Preço a definir'
                : menorPreco === 0
                  ? 'Gratuito'
                  : `a partir de ${moeda.format(menorPreco)}`}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[13px] leading-[1.6] text-fg-muted">
        É assim que o evento aparece na busca e nas listagens do site.
      </p>
    </div>
  );
}
