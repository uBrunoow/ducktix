/**
 * Formato dos documentos de cada collection — o equivalente, na Fase 2, ao
 * antigo `schema.ts` do Drizzle. A estrutura (e as regras que o banco
 * valida) está em `database/criar-banco.js`; se os dois divergirem, o
 * validador `$jsonSchema` recusa a escrita.
 *
 * Os `_id` são strings (UUID v4 gerado pela aplicação), não ObjectId: são os
 * mesmos ids da Fase 1, usados em URLs, cookies de sessão e QR codes.
 */

import type { Collection } from 'mongodb';
import { db } from './client';

/** Espelha `RascunhoDeParticipante` de `ticketing/domain/pedido.ts` — não
 *  importado de lá para este arquivo não depender do domínio. */
export interface RascunhoDeParticipanteDoc {
  nome: string;
  sobrenome: string;
  cpf: string;
  email: string;
  celular: string;
  nomeCracha: string;
  comoConheceu: string;
  linkedin: string;
  github: string;
  empresa: string;
  segmento: string;
  cargo: string;
  nivel: string;
}

// -----------------------------------------------------------------------------
// Identidade
// -----------------------------------------------------------------------------

export interface UsuarioDoc {
  _id: string;
  nome: string;
  email: string;
  senhaHash: string;
  papel: string;
  cpfCnpj: string | null;
  fotoUrl: string | null;
  criadoEm: Date;
  /** Antiga tabela `organizador` (1:1). */
  organizador: {
    id: string;
    nomeFantasia: string;
    documento: string | null;
    emailContato: string | null;
  } | null;
}

export interface TokenRedefinicaoSenhaDoc {
  /** O próprio token é a chave, como era a PK da tabela. */
  _id: string;
  usuarioId: string;
  expiraEm: Date;
}

// -----------------------------------------------------------------------------
// Eventos
// -----------------------------------------------------------------------------

export interface CategoriaDoc {
  _id: string;
  nome: string;
  slug: string;
}

export interface LoteDoc {
  _id: string;
  nome: string;
  precoCentavos: number;
  vagas: number;
  vendidos: number;
  iniciaEm: Date | null;
  encerraEm: Date | null;
  ordem: number;
}

export interface EventoDoc {
  _id: string;
  slug: string;
  nome: string;
  descricao: string;
  local: string | null;
  modalidade: string;
  formatoOnline: string | null;
  status: string;
  visibilidade: string;
  comecaEm: Date;
  terminaEm: Date;
  imagemUrl: string | null;
  isHighlighted: boolean;
  criadoEm: Date;
  /** Referência estendida ao organizador (id + o que a vitrine mostra). */
  organizador: { id: string; usuarioId: string | null; nome: string };
  /** Antiga `evento_categoria` (N:N); o domínio usa a primeira. */
  categorias: { id: string; nome: string }[];
  lotes: LoteDoc[];
}

// -----------------------------------------------------------------------------
// Vendas
// -----------------------------------------------------------------------------

export interface UsoDeCupomDoc {
  _id: string;
  pedidoId: string;
  eventoId: string;
  descontoCentavos: number;
  usadoEm: Date;
}

export interface CupomDoc {
  _id: string;
  codigo: string;
  tipoDesconto: string;
  valor: number;
  validoDe: Date;
  validoAte: Date;
  limiteUso: number;
  /** Contador de usos (antiga coluna `usos`). */
  usos: number;
  ativo: boolean;
  criadoEm: Date;
  /** Antiga `cupom_evento`. */
  eventosIds: string[];
  /** Antiga `uso_de_cupom`. */
  historicoDeUsos: UsoDeCupomDoc[];
}

export interface ItemPedidoDoc {
  _id: string;
  loteId: string;
  eventoId: string;
  quantidade: number;
  precoUnitarioCentavos: number;
}

export interface PagamentoDoc {
  _id: string;
  metodo: string;
  status: string;
  valorCentavos: number;
  codigoExterno: string | null;
  criadoEm: Date;
  pagoEm: Date | null;
}

export interface PedidoDoc {
  _id: string;
  compradorId: string;
  status: string;
  criadoEm: Date;
  reservadoAte: Date | null;
  confirmadoEm: Date | null;
  cupomId: string | null;
  participantesRascunho: RascunhoDeParticipanteDoc[] | null;
  cobranca: {
    cpf: string;
    endereco: {
      cep: string;
      logradouro: string;
      numero: string;
      complemento: string;
      bairro: string;
      cidade: string;
      uf: string;
    };
  } | null;
  itens: ItemPedidoDoc[];
  pagamentos: PagamentoDoc[];
}

// -----------------------------------------------------------------------------
// Participação
// -----------------------------------------------------------------------------

export interface CancelamentoDoc {
  _id: string;
  motivo: string | null;
  status: string;
  solicitadoEm: Date;
  resolvidoEm: Date | null;
}

export interface InscricaoDoc {
  _id: string;
  eventoId: string;
  pedidoId: string;
  itemPedidoId: string;
  compradorId: string;
  lote: { id: string; nome: string };
  precoPagoCentavos: number;
  status: string;
  comoConheceu: string | null;
  inscritoEm: Date;
  /** Cópias do pedido — a lista de inscritos ordena e exibe por elas. */
  pedidoCriadoEm: Date;
  pedidoConfirmadoEm: Date | null;
  /** Antiga tabela `participante`. */
  participante: {
    nome: string;
    sobrenome: string;
    email: string;
    cpf: string | null;
    celular: string | null;
    nomeCracha: string | null;
    linkedin: string | null;
    github: string | null;
    empresa: string | null;
    segmento: string | null;
    cargo: string | null;
    nivel: string | null;
  };
  /** Antiga tabela `ingresso`. */
  ingresso: { id: string; codigo: string; status: string; emitidoEm: Date };
  /** Antiga tabela `check_in` — nulo enquanto a pessoa não entrou. */
  checkIn: { realizadoEm: Date; operadorId: string | null } | null;
  /** Antiga tabela `cancelamento_de_inscricao`. */
  cancelamentos: CancelamentoDoc[];
}

// -----------------------------------------------------------------------------
// Acesso tipado
// -----------------------------------------------------------------------------

export const colecoes = {
  usuarios: (): Collection<UsuarioDoc> => db().collection<UsuarioDoc>('usuarios'),
  tokensRedefinicaoSenha: (): Collection<TokenRedefinicaoSenhaDoc> =>
    db().collection<TokenRedefinicaoSenhaDoc>('tokensRedefinicaoSenha'),
  categorias: (): Collection<CategoriaDoc> => db().collection<CategoriaDoc>('categorias'),
  eventos: (): Collection<EventoDoc> => db().collection<EventoDoc>('eventos'),
  cupons: (): Collection<CupomDoc> => db().collection<CupomDoc>('cupons'),
  pedidos: (): Collection<PedidoDoc> => db().collection<PedidoDoc>('pedidos'),
  inscricoes: (): Collection<InscricaoDoc> => db().collection<InscricaoDoc>('inscricoes'),
};
