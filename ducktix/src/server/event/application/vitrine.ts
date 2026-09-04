import {
  type Evento,
  type StatusLote,
  ingressosVendidos,
  precoAPartirDe,
  statusDoEvento,
} from '../domain/evento';
import type { CatalogoPublicoRepository } from '../ports/catalogo-publico';

export interface EntradaDaVitrine {
  readonly evento: Evento;
  readonly status: StatusLote;
  /** Menor preço disponível em centavos; `null` quando não há lote aberto. */
  readonly precoCentavos: number | null;
}

export interface Faixa {
  readonly id: string;
  readonly titulo: string;
  readonly descricao: string;
  readonly entradas: readonly EntradaDaVitrine[];
}

export interface Filtros {
  readonly busca?: string;
  readonly categoria?: string;
  readonly cidade?: string;
  /** 'semana': começa nos próximos 7 dias. */
  readonly quando?: 'semana';
  /** 'gratuito': todo lote aberto custa zero. */
  readonly preco?: 'gratuito';
}

export interface Vitrine {
  readonly destaques: readonly EntradaDaVitrine[];
  readonly faixas: readonly Faixa[];
  readonly categorias: readonly string[];
  readonly cidades: readonly string[];
  readonly total: number;
}

export interface Resultado {
  readonly entradas: readonly EntradaDaVitrine[];
  readonly categorias: readonly string[];
  readonly cidades: readonly string[];
  readonly total: number;
  readonly filtros: Filtros;
}

const DIA = 24 * 60 * 60 * 1000;

function paraEntrada(evento: Evento, agora: Date): EntradaDaVitrine {
  return {
    evento,
    status: statusDoEvento(evento, agora),
    precoCentavos: precoAPartirDe(evento, agora),
  };
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function aindaVende(entrada: EntradaDaVitrine): boolean {
  return entrada.status === 'a-venda' || entrada.status === 'ultimo-lote';
}

function ordenarPorProcura(entradas: readonly EntradaDaVitrine[]): EntradaDaVitrine[] {
  return [...entradas].sort(
    (a, b) => ingressosVendidos(b.evento) - ingressosVendidos(a.evento),
  );
}

function listasDeFiltro(eventos: readonly Evento[]) {
  const categorias = [...new Set(eventos.map((e) => e.categoria))].sort();
  const cidades = [...new Set(eventos.map((e) => e.local).filter((l): l is string => l !== null))].sort();
  return { categorias, cidades };
}

/** A home sem filtro: destaques em banner e faixas temáticas. */
export async function montarVitrine(
  catalogo: CatalogoPublicoRepository,
  agora: Date,
): Promise<Vitrine> {
  const eventos = (await catalogo.listarTodos()).filter(
    (e) => e.status === 'publicado' && e.visibilidade === 'publico',
  );
  const entradas = eventos.map((evento) => paraEntrada(evento, agora));
  const futuros = entradas.filter((e) => e.evento.comecaEm > agora);
  const vendendo = futuros.filter(aindaVende);

  const destaques = ordenarPorProcura(vendendo).slice(0, 3);
  const idsEmDestaque = new Set(destaques.map((e) => e.evento.id));

  const proximosSeteDias = new Date(agora.getTime() + 7 * DIA);
  const proximosTrintaDias = new Date(agora.getTime() + 30 * DIA);

  const candidatas = (faixa: readonly EntradaDaVitrine[]) =>
    faixa.filter((e) => !idsEmDestaque.has(e.evento.id)).slice(0, 8);

  const faixas: Faixa[] = [
    {
      id: 'esta-semana',
      titulo: 'Esta semana',
      descricao: 'Começa nos próximos sete dias',
      entradas: candidatas(
        vendendo.filter((e) => e.evento.comecaEm <= proximosSeteDias),
      ),
    },
    {
      id: 'quase-esgotados',
      titulo: 'Quase esgotados',
      descricao: 'Último lote aberto',
      entradas: candidatas(vendendo.filter((e) => e.status === 'ultimo-lote')),
    },
    {
      id: 'gratuitos',
      titulo: 'Entrada gratuita',
      descricao: 'Sem custo de ingresso',
      entradas: candidatas(vendendo.filter((e) => e.precoCentavos === 0)),
    },
    {
      id: 'online',
      titulo: 'De qualquer lugar',
      descricao: 'Online e híbridos',
      entradas: candidatas(
        vendendo.filter((e) => e.evento.modalidade !== 'presencial'),
      ),
    },
    {
      id: 'proximo-mes',
      titulo: 'Daqui a um mês',
      descricao: 'Para se planejar com calma',
      entradas: candidatas(
        vendendo.filter((e) => e.evento.comecaEm > proximosTrintaDias),
      ),
    },
  ];

  const { categorias, cidades } = listasDeFiltro(eventos);

  return {
    destaques,
    // Menos de quatro cards não é uma faixa, é uma sobra: esses eventos
    // continuam aparecendo na grade completa.
    faixas: faixas.filter((faixa) => faixa.entradas.length >= 4),
    categorias,
    cidades,
    total: futuros.length,
  };
}

/** A home com filtro: uma grade de resultados, sem banner e sem faixas. */
export async function buscarEventos(
  catalogo: CatalogoPublicoRepository,
  filtros: Filtros,
  agora: Date,
): Promise<Resultado> {
  const eventos = (await catalogo.listarTodos()).filter(
    (e) => e.status === 'publicado' && e.visibilidade === 'publico',
  );
  const termo = filtros.busca ? normalizar(filtros.busca) : '';
  const proximosSeteDiasBusca = new Date(agora.getTime() + 7 * DIA);

  const entradas = eventos
    .filter((evento) => {
      if (filtros.categoria && evento.categoria !== filtros.categoria) return false;
      if (filtros.cidade && evento.local !== filtros.cidade) return false;
      if (filtros.quando === 'semana' && evento.comecaEm > proximosSeteDiasBusca) return false;
      if (termo === '') return true;
      const alvo = normalizar(
        `${evento.nome} ${evento.organizador} ${evento.categoria} ${evento.local ?? 'online'}`,
      );
      return alvo.includes(termo);
    })
    .map((evento) => paraEntrada(evento, agora))
    .filter((entrada) => {
      if (filtros.preco === 'gratuito' && entrada.precoCentavos !== 0) return false;
      return true;
    });

  const { categorias, cidades } = listasDeFiltro(eventos);

  return { entradas, categorias, cidades, total: entradas.length, filtros };
}

export function temFiltro(filtros: Filtros): boolean {
  return Boolean(
    filtros.busca || filtros.categoria || filtros.cidade || filtros.quando || filtros.preco,
  );
}

/** Um evento pelo slug, ou `null` se não existir no catálogo publicado. */
export async function buscarEventoPorSlug(
  catalogo: CatalogoPublicoRepository,
  slug: string,
): Promise<Evento | null> {
  const eventos = (await catalogo.listarTodos()).filter((e) => e.status === 'publicado');
  return eventos.find((evento) => evento.slug === slug) ?? null;
}
