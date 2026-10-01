import { describe, expect, it } from 'vitest';
import { colecoes } from '@/server/db/colecoes';
import { EventoNaoEncontradoError } from '@/server/event/domain/erros';
import { mongoCatalogoPublicoRepository as catalogo } from '@/server/event/infrastructure/mongo-catalogo';
import { mongoCupomRepository as cupons } from '@/server/ticketing/infrastructure/mongo-cupons';
import { mongoPedidosRepository as pedidos } from '@/server/ticketing/infrastructure/mongo-pedidos';
import { criarEvento, criarUsuario, DIA_MS, usarBancoLimpo } from './apoio';

usarBancoLimpo();

const lote = (nome: string, vagas = 10, precoCentavos = 5000) => ({
  nome,
  precoCentavos,
  vagas,
  iniciaEm: null,
  encerraEm: null,
});

describe('eventos (catálogo)', () => {
  it('lista categorias em ordem alfabética', async () => {
    expect(await catalogo.listarCategorias()).toEqual(['Música', 'Tecnologia']);
  });

  it('cria evento como rascunho, com lotes e categoria embutidos', async () => {
    const evento = await criarEvento({ publicar: false, lotes: [lote('Lote 1'), lote('Lote 2')] });

    expect(evento).toMatchObject({ status: 'rascunho', categoria: 'Tecnologia', organizador: 'Org Ltda' });
    expect(evento.lotes.map((l) => l.nome)).toEqual(['Lote 1', 'Lote 2']);
    expect(await catalogo.buscarPorId(evento.id)).toEqual(evento);
  });

  it('cria o organizador uma vez só por usuário (find-or-create)', async () => {
    const dono = await criarUsuario('Org', 'organizador');
    const a = await criarEvento({ organizadorUsuarioId: dono.id });
    const b = await criarEvento({ organizadorUsuarioId: dono.id });

    const usuario = await colecoes.usuarios().findOne({ _id: dono.id });
    const [docA, docB] = await Promise.all([
      colecoes.eventos().findOne({ _id: a.id }),
      colecoes.eventos().findOne({ _id: b.id }),
    ]);
    expect(usuario?.organizador?.id).toBeDefined();
    expect(docA?.organizador.id).toBe(usuario?.organizador?.id);
    expect(docB?.organizador.id).toBe(usuario?.organizador?.id);
  });

  it('gera slug único para nomes repetidos', async () => {
    const a = await criarEvento({ nome: 'Festival' });
    const b = await criarEvento({ nome: 'Festival' });
    expect(a.slug).toBe('festival');
    expect(b.slug).toBe('festival-2');
  });

  it('não grava nada quando a categoria não existe', async () => {
    const dono = await criarUsuario('Org', 'organizador');
    await expect(
      catalogo.criar({
        nome: 'X',
        organizador: 'Org',
        organizadorUsuarioId: dono.id,
        categoria: 'Inexistente',
        modalidade: 'online',
        local: null,
        comecaEm: new Date(),
        terminaEm: new Date(Date.now() + DIA_MS),
        descricao: '',
        imagemUrl: null,
        visibilidade: 'publico',
        formatoOnline: 'ao-vivo',
        lotes: [lote('Único')],
      }),
    ).rejects.toBeInstanceOf(EventoNaoEncontradoError);
    expect(await colecoes.eventos().countDocuments()).toBe(0);
    expect((await colecoes.usuarios().findOne({ _id: dono.id }))?.organizador).toBeNull();
  });

  it('filtra publicados por status e intervalo de datas, em ordem cronológica', async () => {
    const agora = Date.now();
    const depois = await criarEvento({ nome: 'Depois', comecaEm: new Date(agora + 20 * DIA_MS) });
    const antes = await criarEvento({ nome: 'Antes', comecaEm: new Date(agora + 10 * DIA_MS) });
    await criarEvento({ nome: 'Rascunho', comecaEm: new Date(agora + 15 * DIA_MS), publicar: false });
    await criarEvento({ nome: 'Fora', comecaEm: new Date(agora + 90 * DIA_MS) });

    const publicados = await catalogo.listarPublicados(new Date(agora), new Date(agora + 60 * DIA_MS));
    expect(publicados.map((e) => e.id)).toEqual([antes.id, depois.id]);
    expect(await catalogo.listarTodos()).toHaveLength(4);
  });

  it('lista só os eventos do organizador', async () => {
    const dono = await criarUsuario('Org', 'organizador');
    const meu = await criarEvento({ organizadorUsuarioId: dono.id });
    await criarEvento();
    expect((await catalogo.listarDoOrganizador(dono.id)).map((e) => e.id)).toEqual([meu.id]);
  });

  it('publica, despublica e cancela', async () => {
    const evento = await criarEvento({ publicar: false });
    await catalogo.publicar(evento.id);
    expect((await catalogo.buscarPorId(evento.id))?.status).toBe('publicado');
    await catalogo.despublicar(evento.id);
    expect((await catalogo.buscarPorId(evento.id))?.status).toBe('rascunho');
    await catalogo.cancelar(evento.id);
    expect((await catalogo.buscarPorId(evento.id))?.status).toBe('cancelado');
  });

  it('atualiza campos editáveis e troca a categoria', async () => {
    const evento = await criarEvento();
    const editado = await catalogo.atualizar(evento.id, {
      nome: 'Novo nome',
      categoria: 'Música',
      modalidade: 'online',
      local: null,
      comecaEm: evento.comecaEm,
      terminaEm: evento.terminaEm,
      descricao: 'nova',
      imagemUrl: null,
      visibilidade: 'nao-listado',
      formatoOnline: 'videoconferencia',
    });
    expect(editado).toMatchObject({
      nome: 'Novo nome',
      categoria: 'Música',
      modalidade: 'online',
      local: null,
      visibilidade: 'nao-listado',
    });
    expect(editado.lotes).toEqual(evento.lotes);
  });

  it('atualizar evento inexistente falha', async () => {
    const evento = await criarEvento();
    await expect(
      catalogo.atualizar('nao-existe', { ...evento, categoria: 'Tecnologia' }),
    ).rejects.toBeInstanceOf(EventoNaoEncontradoError);
  });

  it('exclui o evento e desfaz o vínculo com cupons (antigo ON DELETE CASCADE)', async () => {
    const evento = await criarEvento();
    const outro = await criarEvento();
    const cupom = await cupons.criar({
      codigo: 'DESC10',
      tipoDesconto: 'percentual',
      valor: 10,
      validoDe: new Date(Date.now() - DIA_MS),
      validoAte: new Date(Date.now() + DIA_MS),
      limiteDeUso: 5,
      eventosIds: [evento.id, outro.id],
    });

    await catalogo.excluir(evento.id);

    expect(await catalogo.buscarPorId(evento.id)).toBeNull();
    expect((await cupons.buscarPorId(cupom.id))?.eventosIds).toEqual([outro.id]);
  });
});

describe('lotes (embutidos no evento)', () => {
  it('adiciona lote no fim da fila e recusa nome repetido (antigo UNIQUE)', async () => {
    const evento = await criarEvento({ lotes: [lote('Lote 1')] });
    const comDois = await catalogo.adicionarLote(evento.id, lote('Lote 2'));
    expect(comDois.lotes.map((l) => l.nome)).toEqual(['Lote 1', 'Lote 2']);

    await expect(catalogo.adicionarLote(evento.id, lote('Lote 2'))).rejects.toThrow('Já existe um lote');
  });

  it('edita lote sem venda e bloqueia lote com venda', async () => {
    const evento = await criarEvento({ lotes: [lote('Lote 1'), lote('Lote 2')] });
    const [l1, l2] = evento.lotes;

    const editado = await catalogo.atualizarLote(evento.id, l1.id, lote('Lote 1', 50, 9900));
    expect(editado.lotes[0]).toMatchObject({ vagas: 50, precoCentavos: 9900 });

    await catalogo.registrarVenda(evento.id, l2.id, 1);
    await expect(catalogo.atualizarLote(evento.id, l2.id, lote('Outro'))).rejects.toThrow('já possui ingressos');
    await expect(catalogo.excluirLote(evento.id, l2.id)).rejects.toThrow('já possui ingressos');
  });

  it('não exclui o último lote nem lote que está em pedido', async () => {
    const evento = await criarEvento({ lotes: [lote('Lote 1'), lote('Lote 2'), lote('Lote 3')] });
    const [l1, l2, l3] = evento.lotes;

    const comprador = await criarUsuario();
    const pedido = await pedidos.criarAberto(comprador.id);
    await pedidos.adicionarItem(pedido.id, {
      eventoId: evento.id,
      loteId: l3.id,
      quantidade: 1,
      precoUnitarioCentavos: 5000,
    });
    await expect(catalogo.excluirLote(evento.id, l3.id)).rejects.toThrow('está em pedidos');

    await catalogo.excluirLote(evento.id, l1.id);
    expect((await catalogo.buscarPorId(evento.id))?.lotes.map((l) => l.id)).toEqual([l2.id, l3.id]);

    await catalogo.excluirLote(evento.id, l2.id);
    await expect(catalogo.excluirLote(evento.id, l3.id)).rejects.toThrow('ao menos um lote');
  });

  it('registrarVenda nunca passa do estoque, mesmo com compras simultâneas', async () => {
    const evento = await criarEvento({ lotes: [lote('Lote 1', 5)] });
    const loteId = evento.lotes[0].id;

    // 12 confirmações concorrentes de 1 ingresso num lote de 5 vagas — o
    // papel que o SELECT ... FOR UPDATE fazia no PostgreSQL.
    const resultados = await Promise.allSettled(
      Array.from({ length: 12 }, () => catalogo.registrarVenda(evento.id, loteId, 1)),
    );

    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(5);
    expect((await catalogo.buscarPorId(evento.id))?.lotes[0].vendidos).toBe(5);
  });
});
