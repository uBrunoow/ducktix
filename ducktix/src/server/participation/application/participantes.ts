import { type Inscricao, nomeCompleto, resumirParticipacao } from '../domain/inscricao';
import { statusDaInscricao } from '../domain/inscricao';
import type { StatusIngresso } from '../domain/ingresso';
import type { FiltroDeInscricoes, InscricoesRepository } from '../ports/inscricoes';

export interface LinhaDeParticipante {
  readonly inscricao: Inscricao;
  readonly status: StatusIngresso;
}

export interface ListaDeParticipantes {
  readonly linhas: readonly LinhaDeParticipante[];
  readonly total: number;
  readonly pagina: number;
  readonly totalDePaginas: number;
  readonly porPagina: number;
}

/**
 * Lista nominal de participantes de um evento, paginada no repositório.
 *
 * A paginação é do repositório e não da tela porque um evento grande passa
 * de mil inscrições: mandar tudo para o React só para recortar 25 linhas
 * seria carregar o banco inteiro na memória do servidor a cada acesso — e no
 * Postgres isso vira LIMIT/OFFSET sem mudar uma linha desta função.
 */
export async function listarParticipantes(
  inscricoes: InscricoesRepository,
  eventoId: string,
  filtro: FiltroDeInscricoes,
): Promise<ListaDeParticipantes> {
  const porPagina = filtro.porPagina ?? 25;
  const pagina = Math.max(1, filtro.pagina ?? 1);

  const { itens, total } = await inscricoes.listarPorEvento(eventoId, { ...filtro, pagina, porPagina });

  return {
    linhas: itens.map((inscricao) => ({ inscricao, status: statusDaInscricao(inscricao) })),
    total,
    pagina,
    totalDePaginas: Math.max(1, Math.ceil(total / porPagina)),
    porPagina,
  };
}

export interface PedidoDoEvento {
  readonly id: string;
  /** Quem comprou: o primeiro nome do pedido, como toda plataforma exibe. */
  readonly comprador: string;
  readonly compradorEmail: string;
  readonly quantidade: number;
  readonly canceladas: number;
  readonly totalCentavos: number;
  readonly lotes: readonly string[];
  readonly compradoEm: Date;
  readonly presentes: number;
}

/**
 * Pedidos do evento, reconstruídos a partir das inscrições.
 *
 * Um pedido é o agrupamento natural de várias inscrições feitas na mesma
 * compra (`inscricao.pedidoId`) — a mesma junção que o relatório vai fazer
 * em SQL por `item_pedido.pedido_id`. Reconstruir aqui evita duplicar o
 * histórico de compra num segundo lugar que pode divergir.
 */
export async function listarPedidosDoEvento(
  inscricoes: InscricoesRepository,
  eventoId: string,
): Promise<readonly PedidoDoEvento[]> {
  const todas = await inscricoes.todasDoEvento(eventoId);

  const porPedido = new Map<string, Inscricao[]>();
  for (const inscricao of todas) {
    const grupo = porPedido.get(inscricao.pedidoId);
    if (grupo) grupo.push(inscricao);
    else porPedido.set(inscricao.pedidoId, [inscricao]);
  }

  return [...porPedido.entries()]
    .map(([id, itens]): PedidoDoEvento => {
      const ativos = itens.filter((i) => !i.cancelada);
      const primeiro = itens[0]!;

      return {
        id,
        comprador: nomeCompleto(primeiro),
        compradorEmail: primeiro.participanteEmail,
        quantidade: itens.length,
        canceladas: itens.length - ativos.length,
        totalCentavos: ativos.reduce((t, i) => t + i.precoPagoCentavos, 0),
        lotes: [...new Set(itens.map((i) => i.loteNome))],
        compradoEm: primeiro.compradoEm,
        presentes: ativos.filter((i) => i.checkInEm !== null).length,
      };
    })
    .sort((a, b) => b.compradoEm.getTime() - a.compradoEm.getTime());
}

/** Números do evento inteiro — reexportado para as telas não importarem o domínio direto. */
export async function resumoDoEvento(inscricoes: InscricoesRepository, eventoId: string) {
  return resumirParticipacao(await inscricoes.todasDoEvento(eventoId));
}
