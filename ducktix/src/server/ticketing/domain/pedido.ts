/**
 * Domínio de pedido. Sem dependência de Postgres, HTTP ou React — ver
 * docs/guidelines.md, "Camadas".
 *
 * "Carrinho" não é uma entidade própria: é o Pedido do participante com
 * status 'aberto'.
 */

import type { Cupom } from './cupom';
import { valorDoDescontoCentavos } from './cupom';

export type StatusPedido = 'aberto' | 'confirmado' | 'cancelado';

export interface ItemPedido {
  readonly id: string;
  readonly eventoId: string;
  readonly loteId: string;
  readonly quantidade: number;
  /** Preço unitário congelado no momento em que o item foi adicionado. */
  readonly precoUnitarioCentavos: number;
}

export interface EnderecoDeCobranca {
  readonly cep: string;
  readonly logradouro: string;
  readonly numero: string;
  readonly complemento: string;
  readonly bairro: string;
  readonly cidade: string;
  readonly uf: string;
}

/** Dados de quem paga — um único conjunto por pedido, não por ingresso:
 *  "você precisa preencher apenas os dados do comprador". */
export interface DadosDeCobranca {
  readonly cpf: string;
  readonly endereco: EnderecoDeCobranca;
}

/**
 * Escolhido junto com os dados de cobrança na Etapa 1 — a Etapa 2 só
 * executa o instrumento desse método (campos de cartão, QR do Pix, geração
 * do boleto), não escolhe de novo.
 */
export type MetodoDePagamento = 'cartao' | 'pix' | 'boleto';

/** Rascunho de participante salvo na Etapa 1 do checkout (dados pessoais),
 *  antes da Etapa 2 (pagamento) confirmar o pedido de verdade. */
export interface RascunhoDeParticipante {
  readonly nome: string;
  readonly sobrenome: string;
  readonly email: string;
  readonly celular: string;
  readonly nomeCracha: string;
  readonly comoConheceu: string;
  readonly linkedin: string;
  readonly github: string;
  readonly empresa: string;
  readonly segmento: string;
  readonly cargo: string;
  readonly nivel: string;
}

export interface Pedido {
  readonly id: string;
  readonly participanteId: string;
  readonly cupomId: string | null;
  readonly status: StatusPedido;
  readonly itens: readonly ItemPedido[];
  readonly criadoEm: Date;
  /** Até quando o pedido segura a reserva dos lotes — passado isso, o
   *  checkout não confirma mais e o participante precisa recomeçar. `null`
   *  enquanto o pedido está vazio (carrinho sem item ainda não reserva nada). */
  readonly reservadoAte: Date | null;
  /** Preenchido na Etapa 1 do checkout (participantes, cobrança e método
   *  escolhido); `null` até lá. A Etapa 2 só executa o método já escolhido. */
  readonly participantes: readonly RascunhoDeParticipante[] | null;
  readonly cobranca: DadosDeCobranca | null;
  readonly metodoPagamento: MetodoDePagamento | null;
}

export function totalBrutoCentavos(pedido: Pedido): number {
  return pedido.itens.reduce(
    (total, item) => total + item.quantidade * item.precoUnitarioCentavos,
    0,
  );
}

/** Quantas unidades de ingresso o pedido tem ao todo — define quantos
 *  formulários de dados de participante o checkout precisa mostrar. */
export function totalDeUnidades(pedido: Pedido): number {
  return pedido.itens.reduce((total, item) => total + item.quantidade, 0);
}

export function totalComDescontoCentavos(pedido: Pedido, cupom: Cupom | null): number {
  const bruto = totalBrutoCentavos(pedido);
  if (!cupom) return bruto;
  const desconto = valorDoDescontoCentavos(cupom, bruto);
  return Math.max(0, bruto - desconto);
}

/** A reserva de 30min protege o lote de sumir enquanto o participante
 *  preenche o checkout — nesta fase é só um relógio no próprio pedido, sem
 *  travar o estoque contra outros carrinhos concorrentes (isso pede
 *  travamento de linha no Postgres, fora do escopo da Fase 1 em memória). */
export const DURACAO_DA_RESERVA_MS = 30 * 60 * 1000;

export function reservaExpirada(pedido: Pedido, agora: Date): boolean {
  return pedido.reservadoAte !== null && pedido.reservadoAte <= agora;
}

export function cpfValido(cpf: string): boolean {
  return cpf.replace(/\D/g, '').length === 11;
}

export function cepValido(cep: string): boolean {
  return cep.replace(/\D/g, '').length === 8;
}
