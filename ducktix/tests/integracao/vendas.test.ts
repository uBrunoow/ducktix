import { describe, expect, it } from 'vitest';
import { colecoes } from '@/server/db/colecoes';
import { mongoCatalogoPublicoRepository as catalogo } from '@/server/event/infrastructure/mongo-catalogo';
import { mongoInscricoesRepository as inscricoes } from '@/server/participation/infrastructure/mongo-inscricoes';
import { mongoIngressosRepository as ingressos } from '@/server/participation/infrastructure/mongo-ingressos';
import { adicionarAoCarrinho } from '@/server/ticketing/application/carrinho';
import { CupomInvalidoError, PedidoJaFinalizadoError } from '@/server/ticketing/domain/erros';
import { aplicarCupom } from '@/server/ticketing/application/checkout';
import { mongoCupomRepository as cupons } from '@/server/ticketing/infrastructure/mongo-cupons';
import { mongoPedidosRepository as pedidos } from '@/server/ticketing/infrastructure/mongo-pedidos';
import { comprar, criarEvento, criarUsuario, DIA_MS, participante, usarBancoLimpo } from './apoio';

usarBancoLimpo();

function dadosDeCupom(codigo: string, eventosIds: string[], limiteDeUso = 10) {
  return {
    codigo,
    tipoDesconto: 'percentual' as const,
    valor: 10,
    validoDe: new Date(Date.now() - DIA_MS),
    validoAte: new Date(Date.now() + DIA_MS),
    limiteDeUso,
    eventosIds,
  };
}

describe('pedidos (itens e pagamentos embutidos)', () => {
  it('carrinho: cria pedido aberto, incrementa o item do mesmo lote e reserva uma vez', async () => {
    const comprador = await criarUsuario();
    const evento = await criarEvento();
    const loteId = evento.lotes[0].id;
    const agora = new Date();

    const primeiro = await adicionarAoCarrinho(pedidos, catalogo, comprador.id, evento.id, loteId, 1, agora);
    const segundo = await adicionarAoCarrinho(pedidos, catalogo, comprador.id, evento.id, loteId, 2, agora);

    expect(segundo.id).toBe(primeiro.id);
    expect(segundo.itens).toHaveLength(1);
    expect(segundo.itens[0]).toMatchObject({ eventoId: evento.id, loteId, quantidade: 3 });
    expect(segundo.reservadoAte).toEqual(primeiro.reservadoAte);
    expect(await pedidos.buscarAbertoPorParticipante(comprador.id)).toMatchObject({ id: primeiro.id });
  });

  it('adicionarItem concorrente no mesmo lote soma as quantidades sem duplicar o item', async () => {
    const comprador = await criarUsuario();
    const evento = await criarEvento();
    const pedido = await pedidos.criarAberto(comprador.id);
    const item = { eventoId: evento.id, loteId: evento.lotes[0].id, quantidade: 1, precoUnitarioCentavos: 100 };

    await Promise.all(Array.from({ length: 5 }, () => pedidos.adicionarItem(pedido.id, item)));

    const final = await pedidos.buscarPorId(pedido.id);
    expect(final?.itens).toHaveLength(1);
    expect(final?.itens[0].quantidade).toBe(5);
  });

  it('trocar o método de pagamento substitui o pendente e calcula o valor pelos itens', async () => {
    const comprador = await criarUsuario();
    const evento = await criarEvento();
    const pedido = await pedidos.criarAberto(comprador.id);
    await pedidos.adicionarItem(pedido.id, {
      eventoId: evento.id,
      loteId: evento.lotes[0].id,
      quantidade: 2,
      precoUnitarioCentavos: 10000,
    });

    await pedidos.definirMetodoPagamento(pedido.id, 'cartao');
    const comPix = await pedidos.definirMetodoPagamento(pedido.id, 'pix');

    expect(comPix.metodoPagamento).toBe('pix');
    const doc = await colecoes.pedidos().findOne({ _id: pedido.id });
    expect(doc?.pagamentos).toHaveLength(1);
    expect(doc?.pagamentos[0]).toMatchObject({ metodo: 'pix', status: 'pendente', valorCentavos: 20000 });
  });

  it('pedido inexistente', async () => {
    expect(await pedidos.buscarPorId('nao-existe')).toBeNull();
    await expect(pedidos.definirCupom('nao-existe', null)).rejects.toThrow();
  });
});

describe('checkout completo (pedido → venda → ingressos → confirmação)', () => {
  it('confirma o pedido, aprova o pagamento, baixa o estoque e emite um ingresso por participante', async () => {
    const comprador = await criarUsuario();
    const evento = await criarEvento();
    const loteId = evento.lotes[0].id;

    const { pedido, ingressos: emitidos } = await comprar({
      compradorId: comprador.id,
      eventoId: evento.id,
      loteId,
      participantes: [participante('Carla', '11111111111'), participante('Davi', '22222222222')],
    });

    expect(pedido.status).toBe('confirmado');
    expect(pedido.metodoPagamento).toBe('pix');
    expect(emitidos).toHaveLength(2);

    const doc = await colecoes.pedidos().findOne({ _id: pedido.id });
    expect(doc?.confirmadoEm).toBeInstanceOf(Date);
    expect(doc?.pagamentos[0]).toMatchObject({ status: 'aprovado', valorCentavos: 20000 });
    expect(doc?.pagamentos[0].pagoEm).toBeInstanceOf(Date);

    expect((await catalogo.buscarPorId(evento.id))?.lotes[0].vendidos).toBe(2);

    // A data de confirmação foi copiada para as inscrições (lista de inscritos).
    const lista = await inscricoes.todasDoEvento(evento.id);
    expect(lista).toHaveLength(2);
    expect(lista.every((i) => i.compradoEm.getTime() === doc?.confirmadoEm?.getTime())).toBe(true);

    expect(await ingressos.listarPorItensDePedido(pedido.itens.map((i) => i.id))).toHaveLength(2);
    expect(await pedidos.listarPorParticipante(comprador.id)).toHaveLength(1);
    expect(await pedidos.participanteJaInscritoNoEvento(evento.id, '11111111111')).toBe(true);
    expect(await pedidos.participanteJaInscritoNoEvento(evento.id, '99999999999')).toBe(false);
  });

  it('pedido confirmado não pode ser confirmado de novo', async () => {
    const comprador = await criarUsuario();
    const evento = await criarEvento();
    const { pedido } = await comprar({
      compradorId: comprador.id,
      eventoId: evento.id,
      loteId: evento.lotes[0].id,
      participantes: [participante('Eva', '33333333333')],
    });
    await expect(aplicarCupom(pedidos, cupons, pedido.id, comprador.id, 'X', new Date())).rejects.toBeInstanceOf(
      PedidoJaFinalizadoError,
    );
  });
});

describe('cupons (eventos e histórico de usos embutidos)', () => {
  it('o mesmo código pode existir em eventos diferentes; a busca respeita o evento', async () => {
    const a = await criarEvento();
    const b = await criarEvento();
    const c = await criarEvento();
    const cupomA = await cupons.criar(dadosDeCupom('promo', [a.id]));
    const cupomB = await cupons.criar(dadosDeCupom('PROMO', [b.id]));

    expect(cupomA.codigo).toBe('PROMO');
    expect((await cupons.buscarPorCodigoNoEvento(' promo ', a.id))?.id).toBe(cupomA.id);
    expect((await cupons.buscarPorCodigoNoEvento('PROMO', b.id))?.id).toBe(cupomB.id);
    expect(await cupons.buscarPorCodigoNoEvento('PROMO', c.id)).toBeNull();
    expect(await cupons.listarTodos()).toHaveLength(2);
  });

  it('cupom de outro evento é recusado no checkout', async () => {
    const comprador = await criarUsuario();
    const evento = await criarEvento();
    const outro = await criarEvento();
    await cupons.criar(dadosDeCupom('OUTRO', [outro.id]));

    const carrinho = await adicionarAoCarrinho(
      pedidos, catalogo, comprador.id, evento.id, evento.lotes[0].id, 1, new Date(),
    );
    await expect(
      aplicarCupom(pedidos, cupons, carrinho.id, comprador.id, 'OUTRO', new Date()),
    ).rejects.toBeInstanceOf(CupomInvalidoError);
  });

  it('desativar o cupom tira ele do checkout', async () => {
    const comprador = await criarUsuario();
    const evento = await criarEvento();
    const cupom = await cupons.criar(dadosDeCupom('OFF', [evento.id]));
    await cupons.definirAtivo(cupom.id, false);

    const carrinho = await adicionarAoCarrinho(
      pedidos, catalogo, comprador.id, evento.id, evento.lotes[0].id, 1, new Date(),
    );
    await expect(
      aplicarCupom(pedidos, cupons, carrinho.id, comprador.id, 'OFF', new Date()),
    ).rejects.toBeInstanceOf(CupomInvalidoError);
  });

  it('compra com cupom registra o uso, o desconto e incrementa o contador', async () => {
    const comprador = await criarUsuario();
    const evento = await criarEvento();
    const cupom = await cupons.criar(dadosDeCupom('DEZ', [evento.id]));

    const { pedido } = await comprar({
      compradorId: comprador.id,
      eventoId: evento.id,
      loteId: evento.lotes[0].id,
      participantes: [participante('Fabi', '44444444444')],
      codigoDoCupom: 'dez',
    });

    expect(pedido.cupomId).toBe(cupom.id);
    expect((await cupons.buscarPorId(cupom.id))?.usos).toBe(1);
    const usos = await cupons.listarUsos(cupom.id);
    expect(usos).toHaveLength(1);
    expect(usos[0]).toMatchObject({ pedidoId: pedido.id, eventoId: evento.id, descontoCentavos: 1000 });
    expect(await cupons.listarUsosPorEvento(evento.id)).toEqual(usos);
  });

  it('registrarUso respeita o limite e não repete o uso do mesmo pedido/evento', async () => {
    const evento = await criarEvento();
    const cupom = await cupons.criar(dadosDeCupom('LIMITE', [evento.id], 2));
    const uso = (pedidoId: string) =>
      cupons.registrarUso({ cupomId: cupom.id, pedidoId, eventoId: evento.id, descontoCentavos: 100 });

    await uso('pedido-1');
    await expect(uso('pedido-1')).rejects.toThrow('limite atingido ou uso já registrado');

    // Concorrência no último uso disponível: só uma das duas passa.
    const resultados = await Promise.allSettled([uso('pedido-2'), uso('pedido-3')]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await cupons.buscarPorId(cupom.id))?.usos).toBe(2);
  });
});
