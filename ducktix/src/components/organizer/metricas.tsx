import type { LucideIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Peças de leitura de dados do back-office.
 *
 * Regra de cor herdada do design system: existe UM acento (o amarelo). Isso
 * proíbe paleta categórica multicolorida — então toda série aqui é de uma
 * cor só e a identidade vem do rótulo, nunca do matiz. Séries de magnitude
 * (receita, vendas) usam o amarelo cheio; o texto do valor fica sempre em
 * tinta de texto, nunca na cor da barra.
 */

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});
const moedaExata = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const numero = new Intl.NumberFormat('pt-BR');

export function formatarMoeda(centavos: number, exata = false): string {
  return (exata ? moedaExata : moeda).format(centavos / 100);
}

export function formatarNumero(valor: number): string {
  return numero.format(valor);
}

/** Cartão de número. É o "hero number" — sem gráfico, o número é o conteúdo. */
export function Metrica({
  rotulo,
  valor,
  apoio,
  icone: Icone,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  apoio?: string;
  icone?: LucideIcon;
  /** O número que o organizador vem ver primeiro ganha o campo amarelo. */
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-card border p-5 shadow-card',
        destaque ? 'border-brand bg-brand-tint' : 'border-line bg-surface',
      )}
    >
      <div className="flex items-center gap-2">
        {Icone ? (
          <Icone
            className={cn(
              'size-4',
              destaque ? 'text-brand-ink' : 'text-fg-muted',
            )}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        ) : null}
        <p
          className={cn(
            'text-[13px] font-medium',
            destaque ? 'text-brand-ink' : 'text-fg-muted',
          )}
        >
          {rotulo}
        </p>
      </div>
      <p className="display mt-2 text-[clamp(1.5rem,2.6vw,2rem)] leading-none tabular-nums">
        {valor}
      </p>
      {apoio ? (
        <p className="mt-1.5 text-[13px] text-fg-muted">{apoio}</p>
      ) : null}
    </div>
  );
}

/**
 * Barra de proporção inline — ocupação, aproveitamento, presença.
 *
 * Neutra por padrão: repetida em cada linha de uma tabela (um lote, um
 * cupom, um evento), o amarelo cheio nela é decoração, não indicador — a
 * regra do design system reserva o acento para ação primária e destaque
 * único. `enfase` existe pro raro caso em que a barra É o destaque da tela
 * (a "Ocupação geral" sozinha num card), não pra multiplicar.
 */
export function BarraDeProporcao({
  percentual,
  rotulo,
  enfase = false,
  className,
}: {
  percentual: number;
  /** Descrição para leitor de tela, já que a barra é puramente visual. */
  rotulo: string;
  /** Reserva o amarelo pro único indicador que é o destaque da tela. */
  enfase?: boolean;
  className?: string;
}) {
  const limitado = Math.max(0, Math.min(100, percentual));

  return (
    <div
      className={cn(
        'h-1.5 w-full overflow-hidden rounded-full bg-surface-2',
        className,
      )}
      role="img"
      aria-label={`${rotulo}: ${limitado}%`}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
          enfase ? 'bg-brand' : 'bg-line-strong',
        )}
        style={{ width: `${limitado}%` }}
      />
    </div>
  );
}

export interface BarraDeDados {
  readonly rotulo: string;
  readonly valor: number;
  /** Texto já formatado à direita — moeda, contagem, o que for. */
  readonly exibicao: string;
  readonly href?: string;
}

/**
 * Gráfico de barras horizontais. Escolhido em vez de barras verticais porque
 * os rótulos aqui são nomes de evento e categoria (texto longo), e na
 * horizontal eles cabem sem girar o texto.
 */
export function BarrasHorizontais({
  dados,
  vazio = 'Sem dados no período.',
}: {
  dados: readonly BarraDeDados[];
  vazio?: string;
}) {
  if (dados.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-fg-muted">{vazio}</p>
    );
  }

  const maximo = Math.max(...dados.map((d) => d.valor), 1);

  return (
    <ul className="grid gap-3">
      {dados.map((item) => (
        <li key={item.rotulo}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[13px] font-medium">
              {item.rotulo}
            </span>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums">
              {item.exibicao}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.round((item.valor / maximo) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Barras verticais para série temporal. Uma série só, então não há legenda:
 * o título do bloco já nomeia o que está sendo medido.
 */
export function BarrasVerticais({
  dados,
  formatarValor,
  altura = 140,
}: {
  dados: readonly { readonly rotulo: string; readonly valor: number }[];
  formatarValor: (valor: number) => string;
  altura?: number;
}) {
  if (dados.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-fg-muted">
        Sem dados no período.
      </p>
    );
  }

  const maximo = Math.max(...dados.map((d) => d.valor), 1);

  return (
    <div className="overflow-x-auto">
      {/* `items-stretch` (o padrão) é obrigatório: com `items-end` as colunas
          encolhem para a altura do conteúdo, e a barra em `%` passa a ser
          porcentagem de zero — o gráfico some. */}
      <div
        className="flex min-w-full items-stretch gap-2"
        style={{ height: altura }}
        role="img"
        aria-label={dados
          .map((d) => `${d.rotulo}: ${formatarValor(d.valor)}`)
          .join('; ')}
      >
        {dados.map((ponto) => (
          <div
            key={ponto.rotulo}
            className="group relative flex min-w-[2.25rem] flex-1 flex-col items-center justify-end"
          >
            {/* Tooltip: o valor exato só aparece no hover, para o eixo não
                virar uma parede de números. */}
            <span className="pointer-events-none absolute -top-1 z-10 hidden -translate-y-full whitespace-nowrap rounded-chip border border-line bg-surface px-2 py-1 text-[11px] font-medium shadow-card group-hover:block">
              {ponto.rotulo} · {formatarValor(ponto.valor)}
            </span>
            <div
              className="w-full rounded-t-[4px] bg-brand transition-colors duration-150 group-hover:bg-[#e8c200]"
              style={{
                height: `${Math.max((ponto.valor / maximo) * 100, 1.5)}%`,
              }}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex min-w-full gap-2">
        {dados.map((ponto) => (
          <span
            key={ponto.rotulo}
            className="min-w-[2.25rem] flex-1 truncate text-center text-[11px] text-fg-muted"
          >
            {ponto.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface ItemDeTira {
  readonly rotulo: string;
  readonly valor: string;
  /** Segunda linha, menor — o detalhe que qualifica o número (ex.: "17%
   *  de 350 lugares"), quando ele existe. */
  readonly apoio?: string;
  /** O número que o organizador vem ver primeiro ganha a tinta de marca. */
  readonly destaque?: boolean;
}

/**
 * Leitura numérica em tira — a alternativa ao grid de `Metrica` para uma
 * tela onde vários números pequenos precisam ser lidos num relance só, sem
 * repetir a mesma grade de cartões que já aparece nas outras seções do
 * evento. Rola na horizontal em telas estreitas em vez de quebrar linha.
 */
export function TiraDeMetricas({
  itens,
  className,
}: {
  itens: readonly ItemDeTira[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-px overflow-x-auto overflow-y-hidden rounded-card border border-line bg-line shadow-card',
        className,
      )}
    >
      {itens.map((item) => (
        <div
          key={item.rotulo}
          className="min-w-[8rem] shrink-0 grow bg-surface px-5 py-5 sm:min-w-0"
        >
          <p
            className={cn(
              'display text-[clamp(1.25rem,2.2vw,1.75rem)] leading-none tabular-nums',
              item.destaque && 'text-brand-ink',
            )}
          >
            {item.valor}
          </p>
          <p className="mt-1 text-[12px] font-medium whitespace-nowrap text-fg-muted">
            {item.rotulo}
          </p>
          {item.apoio ? (
            <p className="mt-0.5 truncate text-[11px] text-fg-muted/80">
              {item.apoio}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** Par anterior/próxima página, no mesmo formato em toda lista paginada do
 *  back-office — extraído porque três telas reimplementavam o mesmo link. */
export function Paginacao({
  paginaAtual,
  totalDePaginas,
  href,
  legenda,
}: {
  paginaAtual: number;
  totalDePaginas: number;
  href: (pagina: number) => Route;
  /** Sobrescreve o texto padrão à esquerda — útil quando a lista já mostra
   *  o total de itens, não só a posição da página. */
  legenda?: React.ReactNode;
}) {
  if (totalDePaginas <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
      <p className="text-[13px] text-fg-muted">
        {legenda ?? (
          <>
            Página {paginaAtual} de {totalDePaginas}
          </>
        )}
      </p>
      <div className="flex items-center gap-2">
        {paginaAtual > 1 ? (
          <Link
            href={href(paginaAtual - 1)}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 hover:border-line-strong hover:bg-surface-2"
          >
            Anterior
          </Link>
        ) : null}
        {paginaAtual < totalDePaginas ? (
          <Link
            href={href(paginaAtual + 1)}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 hover:border-line-strong hover:bg-surface-2"
          >
            Próxima
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** Cabeçalho de bloco do painel. */
export function BlocoDoPainel({
  titulo,
  descricao,
  acao,
  children,
  className,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    // `min-w-0` é obrigatório: como item de grid/flex o padrão é
    // `min-width: auto`, então os `overflow-x-auto` de dentro (tabelas e
    // gráficos largos) empurrariam o bloco em vez de rolar, e a página
    // inteira ganharia barra horizontal.
    <section
      className={cn(
        'min-w-0 overflow-hidden rounded-card border border-line bg-surface shadow-card',
        className,
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="display m-0 text-base">{titulo}</h2>
          {descricao ? (
            <p className="mt-0.5 text-[13px] text-fg-muted">{descricao}</p>
          ) : null}
        </div>
        {acao}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
