import { resumirParticipacao } from '@/server/participation/domain/inscricao';
import type { InscricoesRepository } from '@/server/participation/ports/inscricoes';
import { descricaoDoDesconto, statusDoCupom, type StatusCupom } from '@/server/ticketing/domain/cupom';
import type { CupomRepository } from '@/server/ticketing/ports/cupons';
import {
  type Evento,
  capacidadeTotal,
  ingressosVendidos,
  receitaCentavos,
} from '../domain/evento';
import type { CatalogoPublicoRepository } from '../ports/catalogo-publico';

/**
 * Os três relatórios exigidos pela disciplina, cada um cruzando mais de uma
 * tabela. Ficam na camada de aplicação (não na de apresentação) porque a CLI
 * de demonstração precisa dos mesmos números que a tela.
 *
 * 1. Eventos e participantes — evento × inscrição × check-in
 * 2. Vendas de ingressos     — evento × lote × inscrição
 * 3. Cupons                  — cupom × uso × pedido × evento
 */

// ---------------------------------------------------------------------------
// 1. Eventos e participantes
// ---------------------------------------------------------------------------

export interface LinhaDeParticipacao {
  readonly eventoId: string;
  readonly eventoNome: string;
  readonly categoria: string;
  readonly comecaEm: Date;
  readonly capacidade: number;
  readonly inscritos: number;
  readonly cancelados: number;
  readonly presentes: number;
  readonly ocupacaoPercentual: number;
  readonly taxaDePresenca: number;
  readonly jaAconteceu: boolean;
}

export interface RelatorioDeParticipacao {
  readonly linhas: readonly LinhaDeParticipacao[];
  readonly totalInscritos: number;
  readonly totalPresentes: number;
  readonly totalCancelados: number;
  readonly ocupacaoMedia: number;
  readonly taxaDePresencaMedia: number;
}

export async function relatorioDeParticipacao(
  catalogo: CatalogoPublicoRepository,
  inscricoesRepo: InscricoesRepository,
  agora: Date,
): Promise<RelatorioDeParticipacao> {
  const eventos = await catalogo.listarTodos();
  const inscricoesPorEvento = await Promise.all(
    eventos.map((evento) => inscricoesRepo.todasDoEvento(evento.id)),
  );

  const linhas = eventos
    .map((evento, indice): LinhaDeParticipacao => {
      const resumo = resumirParticipacao(inscricoesPorEvento[indice]);
      const capacidade = capacidadeTotal(evento);
      return {
        eventoId: evento.id,
        eventoNome: evento.nome,
        categoria: evento.categoria,
        comecaEm: evento.comecaEm,
        capacidade,
        inscritos: resumo.inscritos,
        cancelados: resumo.cancelados,
        presentes: resumo.presentes,
        ocupacaoPercentual:
          capacidade === 0 ? 0 : Math.round((resumo.inscritos / capacidade) * 100),
        taxaDePresenca: resumo.taxaDePresenca,
        jaAconteceu: agora >= evento.comecaEm,
      };
    })
    .sort((a, b) => b.comecaEm.getTime() - a.comecaEm.getTime());

  const realizados = linhas.filter((l) => l.jaAconteceu);
  const inscritosRealizados = realizados.reduce((t, l) => t + l.inscritos, 0);
  const presentes = realizados.reduce((t, l) => t + l.presentes, 0);
  const capacidade = linhas.reduce((t, l) => t + l.capacidade, 0);
  const inscritos = linhas.reduce((t, l) => t + l.inscritos, 0);

  return {
    linhas,
    totalInscritos: inscritos,
    totalPresentes: presentes,
    totalCancelados: linhas.reduce((t, l) => t + l.cancelados, 0),
    ocupacaoMedia: capacidade === 0 ? 0 : Math.round((inscritos / capacidade) * 100),
    taxaDePresencaMedia:
      inscritosRealizados === 0 ? 0 : Math.round((presentes / inscritosRealizados) * 100),
  };
}

// ---------------------------------------------------------------------------
// 2. Vendas de ingressos
// ---------------------------------------------------------------------------

export interface LinhaDeVenda {
  readonly eventoId: string;
  readonly eventoNome: string;
  readonly loteNome: string;
  readonly precoCentavos: number;
  readonly vagas: number;
  readonly vendidos: number;
  readonly ocupacaoPercentual: number;
  readonly receitaCentavos: number;
}

export interface RelatorioDeVendas {
  readonly linhas: readonly LinhaDeVenda[];
  readonly receitaTotalCentavos: number;
  readonly ingressosVendidos: number;
  readonly ticketMedioCentavos: number;
  readonly lotesEsgotados: number;
}

export async function relatorioDeVendas(
  catalogo: CatalogoPublicoRepository,
): Promise<RelatorioDeVendas> {
  const eventos = await catalogo.listarTodos();

  const linhas = eventos
    .flatMap((evento) =>
      evento.lotes.map((lote): LinhaDeVenda => ({
        eventoId: evento.id,
        eventoNome: evento.nome,
        loteNome: lote.nome,
        precoCentavos: lote.precoCentavos,
        vagas: lote.vagas,
        vendidos: lote.vendidos,
        ocupacaoPercentual: lote.vagas === 0 ? 0 : Math.round((lote.vendidos / lote.vagas) * 100),
        receitaCentavos: lote.vendidos * lote.precoCentavos,
      })),
    )
    .sort((a, b) => b.receitaCentavos - a.receitaCentavos);

  const receita = linhas.reduce((t, l) => t + l.receitaCentavos, 0);
  const vendidos = linhas.reduce((t, l) => t + l.vendidos, 0);

  return {
    linhas,
    receitaTotalCentavos: receita,
    ingressosVendidos: vendidos,
    ticketMedioCentavos: vendidos === 0 ? 0 : Math.round(receita / vendidos),
    lotesEsgotados: linhas.filter((l) => l.vendidos >= l.vagas).length,
  };
}

// ---------------------------------------------------------------------------
// 3. Cupons
// ---------------------------------------------------------------------------

export interface LinhaDeCupom {
  readonly cupomId: string;
  readonly codigo: string;
  readonly desconto: string;
  readonly status: StatusCupom;
  readonly usos: number;
  readonly limiteDeUso: number;
  readonly aproveitamentoPercentual: number;
  readonly descontoConcedidoCentavos: number;
  readonly eventosAlcancados: number;
  readonly restrito: boolean;
}

export interface RelatorioDeCupons {
  readonly linhas: readonly LinhaDeCupom[];
  readonly totalDeUsos: number;
  readonly descontoTotalCentavos: number;
  readonly cuponsAtivos: number;
}

export async function relatorioDeCupons(
  cupons: CupomRepository,
  agora: Date,
): Promise<RelatorioDeCupons> {
  const todos = await cupons.listarTodos();

  const linhas = await Promise.all(
    todos.map(async (cupom): Promise<LinhaDeCupom> => {
      const usos = await cupons.listarUsos(cupom.id);
      return {
        cupomId: cupom.id,
        codigo: cupom.codigo,
        desconto: descricaoDoDesconto(cupom),
        status: statusDoCupom(cupom, agora),
        usos: cupom.usos,
        limiteDeUso: cupom.limiteDeUso,
        aproveitamentoPercentual:
          cupom.limiteDeUso === 0 ? 0 : Math.round((cupom.usos / cupom.limiteDeUso) * 100),
        descontoConcedidoCentavos: usos.reduce((t, u) => t + u.descontoCentavos, 0),
        eventosAlcancados: new Set(usos.map((u) => u.eventoId)).size,
        restrito: cupom.eventosIds.length > 0,
      };
    }),
  );

  return {
    linhas: linhas.sort((a, b) => b.usos - a.usos),
    totalDeUsos: linhas.reduce((t, l) => t + l.usos, 0),
    descontoTotalCentavos: linhas.reduce((t, l) => t + l.descontoConcedidoCentavos, 0),
    cuponsAtivos: linhas.filter((l) => l.status === 'ativo').length,
  };
}

/** Eventos ordenados por receita — usado no topo da visão geral. */
export function ordenarPorReceita(eventos: readonly Evento[]): readonly Evento[] {
  return [...eventos].sort((a, b) => receitaCentavos(b) - receitaCentavos(a));
}

export { ingressosVendidos, receitaCentavos };
