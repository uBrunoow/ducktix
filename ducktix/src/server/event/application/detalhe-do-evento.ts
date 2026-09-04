import type { Cupom } from '@/server/ticketing/domain/cupom';
import type { CupomRepository } from '@/server/ticketing/ports/cupons';
import {
  type Inscricao,
  resumirParticipacao,
  type ResumoDeParticipacao,
  statusDaInscricao,
} from '@/server/participation/domain/inscricao';
import type { StatusIngresso } from '@/server/participation/domain/ingresso';
import type { InscricoesRepository } from '@/server/participation/ports/inscricoes';
import {
  type Evento,
  type Lote,
  type StatusLote,
  capacidadeTotal,
  ingressosVendidos,
  loteEstaAberto,
  receitaCentavos,
  statusDoEvento,
} from '../domain/evento';
import type { CatalogoPublicoRepository } from '../ports/catalogo-publico';

export interface LinhaDeLote {
  readonly lote: Lote;
  readonly aberto: boolean;
  readonly ocupacaoPercentual: number;
  readonly receitaCentavos: number;
  readonly participacaoNaReceita: number;
}

export interface InscricaoNaTabela {
  readonly inscricao: Inscricao;
  readonly status: StatusIngresso;
}

export interface DetalheDoEvento {
  readonly evento: Evento;
  readonly status: StatusLote;
  readonly jaAconteceu: boolean;
  readonly ingressosVendidos: number;
  readonly capacidade: number;
  readonly ocupacaoPercentual: number;
  readonly receitaCentavos: number;
  readonly ticketMedioCentavos: number;
  readonly participacao: ResumoDeParticipacao;
  readonly lotes: readonly LinhaDeLote[];
  readonly inscricoes: readonly InscricaoNaTabela[];
  readonly cuponsAplicaveis: readonly Cupom[];
  /** Vendas por dia nos 30 dias anteriores ao evento. */
  readonly vendasPorDia: readonly { readonly rotulo: string; readonly valor: number }[];
}

const diaCurto = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

/**
 * Tudo o que a tela de um evento precisa, montado numa passada só: números de
 * ocupação e receita, desempenho por lote, a lista nominal de inscritos com o
 * status de check-in e a curva de vendas.
 */
export async function montarDetalheDoEvento(
  catalogo: CatalogoPublicoRepository,
  cupons: CupomRepository,
  inscricoesRepo: InscricoesRepository,
  eventoId: string,
  agora: Date,
): Promise<DetalheDoEvento | null> {
  const evento = await catalogo.buscarPorId(eventoId);
  if (!evento) return null;

  const inscricoes = await inscricoesRepo.todasDoEvento(evento.id);
  const participacao = resumirParticipacao(inscricoes);
  const vendidos = ingressosVendidos(evento);
  const capacidade = capacidadeTotal(evento);
  const receita = receitaCentavos(evento);

  const lotes: LinhaDeLote[] = evento.lotes.map((lote) => {
    const receitaDoLote = lote.vendidos * lote.precoCentavos;
    return {
      lote,
      aberto: loteEstaAberto(lote, agora),
      ocupacaoPercentual: lote.vagas === 0 ? 0 : Math.round((lote.vendidos / lote.vagas) * 100),
      receitaCentavos: receitaDoLote,
      participacaoNaReceita: receita === 0 ? 0 : Math.round((receitaDoLote / receita) * 100),
    };
  });

  // Curva de vendas: agrupa as compras por dia nos 30 dias que antecedem o
  // evento — a janela em que praticamente toda a venda acontece.
  const inicioDaJanela = new Date(evento.comecaEm.getTime() - 30 * 24 * 60 * 60 * 1000);
  const porDia = new Map<number, number>();
  for (const inscricao of inscricoes) {
    if (inscricao.cancelada || inscricao.compradoEm < inicioDaJanela) continue;
    const dia = new Date(inscricao.compradoEm);
    dia.setHours(0, 0, 0, 0);
    porDia.set(dia.getTime(), (porDia.get(dia.getTime()) ?? 0) + 1);
  }
  const vendasPorDia = [...porDia]
    .sort(([a], [b]) => a - b)
    .map(([tempo, valor]) => ({ rotulo: diaCurto.format(new Date(tempo)), valor }));

  return {
    evento,
    status: statusDoEvento(evento, agora),
    jaAconteceu: agora >= evento.comecaEm,
    ingressosVendidos: vendidos,
    capacidade,
    ocupacaoPercentual: capacidade === 0 ? 0 : Math.round((vendidos / capacidade) * 100),
    receitaCentavos: receita,
    ticketMedioCentavos: vendidos === 0 ? 0 : Math.round(receita / vendidos),
    participacao,
    lotes,
    inscricoes: inscricoes.map((inscricao) => ({
      inscricao,
      status: statusDaInscricao(inscricao),
    })),
    cuponsAplicaveis: await cupons.listarTodos(),
    vendasPorDia,
  };
}
