import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach } from 'vitest';
import { fecharConexao } from '@/server/db/client';
import { colecoes } from '@/server/db/colecoes';
import { mongoCatalogoPublicoRepository as catalogo } from '@/server/event/infrastructure/mongo-catalogo';
import type { DadosDeNovoLote } from '@/server/event/ports/catalogo-publico';
import { mongoUsuariosRepository as usuarios } from '@/server/identity/infrastructure/mongo-usuarios';
import { mongoIngressosRepository as ingressos } from '@/server/participation/infrastructure/mongo-ingressos';
import { adicionarAoCarrinho } from '@/server/ticketing/application/carrinho';
import { aplicarCupom, avancarParaPagamento, confirmarPedido } from '@/server/ticketing/application/checkout';
import type { RascunhoDeParticipante } from '@/server/ticketing/domain/pedido';
import { mongoCupomRepository as cupons } from '@/server/ticketing/infrastructure/mongo-cupons';
import { mongoPedidosRepository as pedidos } from '@/server/ticketing/infrastructure/mongo-pedidos';

/** Esvazia as collections antes de cada teste e fecha a conexão no fim do arquivo. */
export function usarBancoLimpo(): void {
  beforeEach(async () => {
    await Promise.all(
      [
        colecoes.usuarios(),
        colecoes.tokensRedefinicaoSenha(),
        colecoes.categorias(),
        colecoes.eventos(),
        colecoes.cupons(),
        colecoes.pedidos(),
        colecoes.inscricoes(),
      ].map((c) => c.deleteMany({})),
    );
    await colecoes.categorias().insertMany([
      { _id: randomUUID(), nome: 'Tecnologia', slug: 'tecnologia' },
      { _id: randomUUID(), nome: 'Música', slug: 'musica' },
    ]);
  });
  afterAll(fecharConexao);
}

export const DIA_MS = 24 * 60 * 60 * 1000;

export function criarUsuario(nome = 'Ana Souza', papel: 'participante' | 'organizador' = 'participante') {
  return usuarios.criar({
    nome,
    email: `${randomUUID()}@teste.com`,
    papel,
    senhaHash: 'hash',
  });
}

export async function criarEvento(opcoes: {
  organizadorUsuarioId?: string;
  nome?: string;
  comecaEm?: Date;
  lotes?: DadosDeNovoLote[];
  publicar?: boolean;
} = {}) {
  const organizadorUsuarioId =
    opcoes.organizadorUsuarioId ?? (await criarUsuario('Org Ltda', 'organizador')).id;
  const comecaEm = opcoes.comecaEm ?? new Date(Date.now() + 30 * DIA_MS);
  const evento = await catalogo.criar({
    nome: opcoes.nome ?? 'Conferência de Banco de Dados',
    organizador: 'Org Ltda',
    organizadorUsuarioId,
    categoria: 'Tecnologia',
    modalidade: 'presencial',
    local: 'UDESC Joinville',
    comecaEm,
    terminaEm: new Date(comecaEm.getTime() + DIA_MS),
    descricao: '<p>Descrição</p>',
    imagemUrl: null,
    visibilidade: 'publico',
    formatoOnline: null,
    lotes: opcoes.lotes ?? [
      { nome: 'Lote 1', precoCentavos: 10000, vagas: 100, iniciaEm: null, encerraEm: null },
    ],
  });
  if (opcoes.publicar ?? true) await catalogo.publicar(evento.id);
  return evento;
}

export function participante(nome: string, cpf: string): RascunhoDeParticipante {
  return {
    nome,
    sobrenome: 'Teste',
    cpf,
    email: `${nome.toLowerCase()}@teste.com`,
    celular: '47999990000',
    nomeCracha: nome,
    comoConheceu: 'Instagram',
    linkedin: '',
    github: '',
    empresa: '',
    segmento: '',
    cargo: '',
    nivel: '',
  };
}

/** CPF válido (dígitos verificadores corretos) para os dados de cobrança. */
export const CPF_DE_COBRANCA = '52998224725';

/**
 * Compra completa pela camada de aplicação — carrinho, Etapa 1 e
 * confirmação —, exatamente o caminho das Server Actions.
 */
export async function comprar(opcoes: {
  compradorId: string;
  eventoId: string;
  loteId: string;
  participantes: RascunhoDeParticipante[];
  codigoDoCupom?: string;
}) {
  const agora = new Date();
  const carrinho = await adicionarAoCarrinho(
    pedidos,
    catalogo,
    opcoes.compradorId,
    opcoes.eventoId,
    opcoes.loteId,
    opcoes.participantes.length,
    agora,
  );
  if (opcoes.codigoDoCupom) {
    await aplicarCupom(pedidos, cupons, carrinho.id, opcoes.compradorId, opcoes.codigoDoCupom, agora);
  }
  await avancarParaPagamento(
    pedidos,
    cupons,
    carrinho.id,
    opcoes.compradorId,
    {
      participantes: opcoes.participantes,
      cobranca: {
        cpf: CPF_DE_COBRANCA,
        endereco: {
          cep: '89219710',
          logradouro: 'Rua Paulo Malschitzki',
          numero: '200',
          complemento: '',
          bairro: 'Zona Industrial Norte',
          cidade: 'Joinville',
          uf: 'SC',
        },
      },
      metodoPagamento: 'pix',
    },
    agora,
  );
  return confirmarPedido({ pedidos, cupons, ingressos, catalogo }, carrinho.id, opcoes.compradorId, agora);
}
