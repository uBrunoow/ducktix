import {
  type Evento,
  type StatusLote,
  capacidadeTotal,
  ingressosVendidos,
  receitaCentavos,
  statusDoEvento,
} from '../domain/evento';
import { resumirParticipacao, type Inscricao, type ResumoDeParticipacao } from '@/server/participation/domain/inscricao';
import type { InscricoesRepository } from '@/server/participation/ports/inscricoes';
import type { CatalogoPublicoRepository } from '../ports/catalogo-publico';

export interface LinhaDoPainel {
  readonly evento: Evento;
  readonly status: StatusLote;
  readonly ingressosVendidos: number;
  readonly capacidade: number;
  readonly ocupacaoPercentual: number;
  readonly receitaCentavos: number;
  readonly participacao: ResumoDeParticipacao;
  readonly jaAconteceu: boolean;
}

export interface PontoDaSerie {
  readonly rotulo: string;
  readonly valor: number;
}

export interface PainelOrganizador {
  readonly totalEventos: number;
  readonly eventosPublicados: number;
  readonly eventosRascunho: number;
  readonly eventosFuturos: number;
  readonly ingressosVendidos: number;
  readonly capacidadeTotal: number;
  readonly ocupacaoMedia: number;
  readonly receitaCentavos: number;
  readonly ticketMedioCentavos: number;
  readonly totalPedidos: number;
  readonly totalParticipantes: number;
  readonly totalPresentes: number;
  readonly totalCancelados: number;
  readonly taxaDePresenca: number;
  /** Eventos que já aconteceram — base da taxa de presença. */
  readonly eventosRealizados: number;
  readonly receitaPorMes: readonly PontoDaSerie[];
  readonly receitaPorCategoria: readonly PontoDaSerie[];
  readonly linhas: readonly LinhaDoPainel[];
}

const mesCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' });

export function montarLinha(
  evento: Evento,
  inscricoes: readonly Inscricao[],
  agora: Date,
): LinhaDoPainel {
  const vendidos = ingressosVendidos(evento);
  const capacidade = capacidadeTotal(evento);

  return {
    evento,
    status: statusDoEvento(evento, agora),
    ingressosVendidos: vendidos,
    capacidade,
    ocupacaoPercentual: capacidade === 0 ? 0 : Math.round((vendidos / capacidade) * 100),
    receitaCentavos: receitaCentavos(evento),
    participacao: resumirParticipacao(inscricoes),
    jaAconteceu: agora >= evento.comecaEm,
  };
}

/**
 * Visão geral do organizador. O catálogo desta fase é compartilhado (não há
 * ainda um vínculo evento→organizador logado no domínio), então o painel
 * cobre todo o catálogo publicado — a mesma base de dados sintéticos da
 * vitrine pública, não um portfólio inventado.
 *
 * Todos os números saem de duas fontes reais do sistema: os lotes (vendidos,
 * vagas, preço) e as inscrições derivadas deles. Nada aqui é digitado à mão.
 */
export async function montarPainel(
  catalogo: CatalogoPublicoRepository,
  inscricoesRepo: InscricoesRepository,
  organizadorUsuarioId: string,
  agora: Date,
): Promise<PainelOrganizador> {
  const eventos = await catalogo.listarDoOrganizador(organizadorUsuarioId);
  const inscricoesPorEvento = await Promise.all(
    eventos.map((evento) => inscricoesRepo.todasDoEvento(evento.id)),
  );
  const linhas = eventos
    .map((evento, indice) => montarLinha(evento, inscricoesPorEvento[indice], agora))
    .sort((a, b) => a.evento.comecaEm.getTime() - b.evento.comecaEm.getTime());

  const receita = linhas.reduce((total, l) => total + l.receitaCentavos, 0);
  const vendidos = linhas.reduce((total, l) => total + l.ingressosVendidos, 0);
  const capacidade = linhas.reduce((total, l) => total + l.capacidade, 0);
  const realizadas = linhas.filter((l) => l.jaAconteceu);
  const inscritosRealizados = realizadas.reduce((t, l) => t + l.participacao.inscritos, 0);
  const presentes = realizadas.reduce((t, l) => t + l.participacao.presentes, 0);

  // Receita por mês do evento, em ordem cronológica — a série já vem ordenada
  // porque `linhas` está ordenada por data.
  const porMes = new Map<string, number>();
  for (const linha of linhas) {
    const chave = mesCurto.format(linha.evento.comecaEm).replace('.', '');
    porMes.set(chave, (porMes.get(chave) ?? 0) + linha.receitaCentavos);
  }

  const porCategoria = new Map<string, number>();
  for (const linha of linhas) {
    porCategoria.set(
      linha.evento.categoria,
      (porCategoria.get(linha.evento.categoria) ?? 0) + linha.receitaCentavos,
    );
  }

  return {
    totalEventos: eventos.length,
    eventosPublicados: linhas.filter((l) => l.evento.status === 'publicado').length,
    eventosRascunho: linhas.filter((l) => l.evento.status === 'rascunho').length,
    eventosFuturos: linhas.filter((l) => l.evento.comecaEm > agora).length,
    ingressosVendidos: vendidos,
    capacidadeTotal: capacidade,
    ocupacaoMedia: capacidade === 0 ? 0 : Math.round((vendidos / capacidade) * 100),
    receitaCentavos: receita,
    ticketMedioCentavos: vendidos === 0 ? 0 : Math.round(receita / vendidos),
    totalPedidos: linhas.reduce((total, l) => total + l.participacao.pedidos, 0),
    totalParticipantes: linhas.reduce((total, l) => total + l.participacao.inscritos, 0),
    totalPresentes: presentes,
    totalCancelados: linhas.reduce((total, l) => total + l.participacao.cancelados, 0),
    taxaDePresenca:
      inscritosRealizados === 0 ? 0 : Math.round((presentes / inscritosRealizados) * 100),
    eventosRealizados: realizadas.length,
    receitaPorMes: [...porMes].map(([rotulo, valor]) => ({ rotulo, valor })),
    receitaPorCategoria: [...porCategoria]
      .map(([rotulo, valor]) => ({ rotulo, valor }))
      .sort((a, b) => b.valor - a.valor),
    linhas,
  };
}
