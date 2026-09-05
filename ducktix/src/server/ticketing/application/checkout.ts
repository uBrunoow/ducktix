import type { CatalogoPublicoRepository } from '@/server/event/ports/catalogo-publico';
import type { DadosProfissionais, Ingresso } from '@/server/participation/domain/ingresso';
import { emailValido } from '@/server/participation/domain/ingresso';
import type { IngressosRepository } from '@/server/participation/ports/ingressos';
import { cupomValeParaEvento, cupomValido, valorDoDescontoCentavos } from '../domain/cupom';
import {
  CupomInvalidoError,
  DadosDeCobrancaInvalidosError,
  DadosDeParticipanteInvalidosError,
  ParticipantesAindaNaoPreenchidosError,
  PedidoExpiradoError,
  PedidoJaFinalizadoError,
  PedidoNaoEncontradoError,
  PedidoNaoPertenceAoUsuarioError,
} from '../domain/erros';
import {
  cepValido,
  cpfValido,
  reservaExpirada,
  totalBrutoCentavos,
  totalDeUnidades,
  type DadosDeCobranca,
  type MetodoDePagamento,
  type Pedido,
  type RascunhoDeParticipante,
} from '../domain/pedido';
import type { CupomRepository } from '../ports/cupons';
import type { PedidosRepository } from '../ports/pedidos';

function exigirPedidoAbertoDoUsuario(pedido: Pedido | null, participanteId: string): Pedido {
  if (!pedido) throw new PedidoNaoEncontradoError();
  if (pedido.participanteId !== participanteId) throw new PedidoNaoPertenceAoUsuarioError();
  if (pedido.status !== 'aberto') throw new PedidoJaFinalizadoError();
  return pedido;
}

export async function aplicarCupom(
  pedidos: PedidosRepository,
  cupons: CupomRepository,
  pedidoId: string,
  participanteId: string,
  codigo: string,
  agora: Date,
): Promise<Pedido> {
  const pedido = exigirPedidoAbertoDoUsuario(await pedidos.buscarPorId(pedidoId), participanteId);

  const eventoId = pedido.itens[0]?.eventoId;
  const cupom = eventoId ? await cupons.buscarPorCodigoNoEvento(codigo, eventoId) : null;
  if (!cupom || !cupomValido(cupom, agora)) throw new CupomInvalidoError();

  // O cupom precisa pertencer ao evento do item do pedido.
  const valeParaAlgumItem = pedido.itens.some((item) => cupomValeParaEvento(cupom, item.eventoId));
  if (!valeParaAlgumItem) throw new CupomInvalidoError();

  return pedidos.definirCupom(pedido.id, cupom.id);
}

/**
 * Etapa 1 do checkout: dados pessoais de cada participante + dados de quem
 * paga (uma vez por pedido) + qual método de pagamento vai ser usado. A
 * Etapa 2 (`confirmarPedido`) só executa o método já escolhido aqui.
 */
export async function avancarParaPagamento(
  pedidos: PedidosRepository,
  pedidoId: string,
  participanteId: string,
  dados: {
    readonly participantes: readonly RascunhoDeParticipante[];
    readonly cobranca: DadosDeCobranca;
    readonly metodoPagamento: MetodoDePagamento;
  },
  agora: Date,
): Promise<Pedido> {
  const pedido = exigirPedidoAbertoDoUsuario(await pedidos.buscarPorId(pedidoId), participanteId);
  if (reservaExpirada(pedido, agora)) throw new PedidoExpiradoError();

  const unidades = totalDeUnidades(pedido);
  if (dados.participantes.length !== unidades) {
    throw new DadosDeParticipanteInvalidosError(
      `Informe os dados de ${unidades} participante(s) — foram enviados ${dados.participantes.length}.`,
    );
  }
  for (const dado of dados.participantes) {
    if (dado.nome.trim().length < 2 || dado.sobrenome.trim().length < 2) {
      throw new DadosDeParticipanteInvalidosError('Informe nome e sobrenome de cada participante.');
    }
    if (!emailValido(dado.email)) {
      throw new DadosDeParticipanteInvalidosError('Informe um e-mail válido para cada participante.');
    }
  }

  if (!cpfValido(dados.cobranca.cpf)) {
    throw new DadosDeCobrancaInvalidosError('Informe um CPF válido (11 dígitos).');
  }
  if (!cepValido(dados.cobranca.endereco.cep)) {
    throw new DadosDeCobrancaInvalidosError('Informe um CEP válido.');
  }

  await pedidos.definirParticipantes(pedido.id, dados.participantes);
  await pedidos.definirCobranca(pedido.id, dados.cobranca);
  return pedidos.definirMetodoPagamento(pedido.id, dados.metodoPagamento);
}

export interface DependenciasDoCheckout {
  readonly pedidos: PedidosRepository;
  readonly cupons: CupomRepository;
  readonly ingressos: IngressosRepository;
  readonly catalogo: CatalogoPublicoRepository;
}

function paraDadosProfissionais(dado: RascunhoDeParticipante): DadosProfissionais | null {
  const preenchido = dado.linkedin || dado.github || dado.empresa || dado.segmento || dado.cargo || dado.nivel;
  if (!preenchido) return null;
  return {
    linkedin: dado.linkedin.trim(),
    github: dado.github.trim(),
    empresa: dado.empresa.trim(),
    segmento: dado.segmento.trim(),
    cargo: dado.cargo.trim(),
    nivel: dado.nivel.trim(),
  };
}

/**
 * Etapa 2 do checkout: executa o método de pagamento já escolhido na Etapa 1
 * e confirma. Marca o pedido como confirmado, registra a venda em cada lote
 * (decrementa vagas) e emite um ingresso por unidade a partir do rascunho de
 * participantes. Pagamento é mock instantâneo — não há gateway nesta fase,
 * confirmar já é "pago".
 */
export async function confirmarPedido(
  deps: DependenciasDoCheckout,
  pedidoId: string,
  participanteId: string,
  agora: Date,
): Promise<{ pedido: Pedido; ingressos: readonly Ingresso[] }> {
  const pedido = exigirPedidoAbertoDoUsuario(
    await deps.pedidos.buscarPorId(pedidoId),
    participanteId,
  );
  if (reservaExpirada(pedido, agora)) throw new PedidoExpiradoError();
  if (!pedido.participantes || !pedido.cobranca || !pedido.metodoPagamento) {
    throw new ParticipantesAindaNaoPreenchidosError();
  }

  // O uso é registrado por evento, não só contado: é o que alimenta a tela de
  // "uso de cupons" do organizador. Um pedido com itens de mais de um evento
  // gera uma linha por evento, com o desconto rateado pelo peso de cada um.
  if (pedido.cupomId) {
    const cupom = await deps.cupons.buscarPorId(pedido.cupomId);
    if (cupom) {
      const bruto = totalBrutoCentavos(pedido);
      const descontoTotal = valorDoDescontoCentavos(cupom, bruto);
      const porEvento = new Map<string, number>();
      for (const item of pedido.itens) {
        porEvento.set(
          item.eventoId,
          (porEvento.get(item.eventoId) ?? 0) + item.quantidade * item.precoUnitarioCentavos,
        );
      }
      for (const [eventoId, valorDoEvento] of porEvento) {
        await deps.cupons.registrarUso({
          cupomId: cupom.id,
          pedidoId: pedido.id,
          eventoId,
          descontoCentavos:
            bruto === 0 ? 0 : Math.round((descontoTotal * valorDoEvento) / bruto),
        });
      }
    }
  }

  const participantes = pedido.participantes;
  const ingressosEmitidos: Ingresso[] = [];
  let indiceParticipante = 0;
  for (const item of pedido.itens) {
    await deps.catalogo.registrarVenda(item.eventoId, item.loteId, item.quantidade);
    for (let i = 0; i < item.quantidade; i++) {
      const dado = participantes[indiceParticipante];
      indiceParticipante++;
      const ingresso = await deps.ingressos.emitir({
        itemPedidoId: item.id,
        eventoId: item.eventoId,
        participanteNome: dado.nome.trim(),
        participanteSobrenome: dado.sobrenome.trim(),
        participanteEmail: dado.email.trim().toLowerCase(),
        participanteCelular: dado.celular.trim(),
        participanteNomeCracha: dado.nomeCracha.trim(),
        dadosProfissionais: paraDadosProfissionais(dado),
        comoConheceu: dado.comoConheceu.trim() || null,
      });
      ingressosEmitidos.push(ingresso);
    }
  }

  const confirmado = await deps.pedidos.atualizarStatus(pedido.id, 'confirmado');
  return { pedido: confirmado, ingressos: ingressosEmitidos };
}
