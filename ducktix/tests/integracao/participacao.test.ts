import { describe, expect, it } from 'vitest';
import { mongoCatalogoPublicoRepository as catalogo } from '@/server/event/infrastructure/mongo-catalogo';
import { relatorioDeParticipacao } from '@/server/event/application/relatorios';
import { solicitarCancelamento } from '@/server/participation/application/cancelamentos';
import { realizarCheckIn } from '@/server/participation/application/check-in';
import { mongoCancelamentosRepository as cancelamentos } from '@/server/participation/infrastructure/mongo-cancelamentos';
import { mongoInscricoesRepository as inscricoes } from '@/server/participation/infrastructure/mongo-inscricoes';
import { comprar, criarEvento, criarUsuario, participante, usarBancoLimpo } from './apoio';

usarBancoLimpo();

/** Evento com `n` inscritos, comprados por um único comprador. */
async function eventoComInscritos(nomes: string[]) {
  const comprador = await criarUsuario();
  const evento = await criarEvento();
  const { ingressos } = await comprar({
    compradorId: comprador.id,
    eventoId: evento.id,
    loteId: evento.lotes[0].id,
    participantes: nomes.map((nome, i) => participante(nome, String(i + 1).padStart(11, '0'))),
  });
  return { comprador, evento, ingressos };
}

describe('inscrições (lista de inscritos)', () => {
  it('pagina e conta o total', async () => {
    const nomes = Array.from({ length: 7 }, (_, i) => `Pessoa${i}`);
    const { evento } = await eventoComInscritos(nomes);

    const pagina1 = await inscricoes.listarPorEvento(evento.id, { pagina: 1, porPagina: 3 });
    const pagina3 = await inscricoes.listarPorEvento(evento.id, { pagina: 3, porPagina: 3 });
    expect(pagina1.total).toBe(7);
    expect(pagina1.itens).toHaveLength(3);
    expect(pagina3.itens).toHaveLength(1);

    const todos = new Set<string>();
    for (const p of [1, 2, 3]) {
      for (const i of (await inscricoes.listarPorEvento(evento.id, { pagina: p, porPagina: 3 })).itens) {
        todos.add(i.id);
      }
    }
    expect(todos.size).toBe(7);
  });

  it('busca por nome, e-mail ou código, sem diferenciar maiúsculas', async () => {
    const { evento, ingressos } = await eventoComInscritos(['Mariana', 'Joao', 'Pedro']);

    expect((await inscricoes.listarPorEvento(evento.id, { busca: 'mari' })).itens.map((i) => i.participanteNome)).toEqual([
      'Mariana',
    ]);
    expect((await inscricoes.listarPorEvento(evento.id, { busca: 'JOAO@TESTE' })).total).toBe(1);
    expect((await inscricoes.listarPorEvento(evento.id, { busca: ingressos[2].id })).itens[0].participanteNome).toBe(
      'Pedro',
    );
    // Caracteres especiais de regex são tratados como texto.
    expect((await inscricoes.listarPorEvento(evento.id, { busca: '.*' })).total).toBe(0);
  });

  it('não mistura inscritos de eventos diferentes', async () => {
    const a = await eventoComInscritos(['Ana']);
    await eventoComInscritos(['Beto', 'Caio']);
    expect((await inscricoes.listarPorEvento(a.evento.id)).total).toBe(1);
  });
});

describe('check-in (subdocumento da inscrição)', () => {
  it('portaria aceita o código, recusa repetido e de outro evento', async () => {
    const { evento, ingressos } = await eventoComInscritos(['Ana']);
    const outro = await criarEvento();
    const codigo = ingressos[0].id;

    const primeira = await realizarCheckIn(inscricoes, evento.id, codigo, new Date());
    expect(primeira.aceito).toBe(true);

    const repetida = await realizarCheckIn(inscricoes, evento.id, codigo, new Date());
    expect(repetida).toMatchObject({ aceito: false, motivo: 'ja-utilizado' });

    const errada = await realizarCheckIn(inscricoes, outro.id, codigo, new Date());
    expect(errada).toMatchObject({ aceito: false, motivo: 'outro-evento' });

    const inexistente = await realizarCheckIn(inscricoes, evento.id, 'codigo-que-nao-existe', new Date());
    expect(inexistente).toMatchObject({ aceito: false, motivo: 'nao-encontrado' });
  });

  it('duas leitoras ao mesmo tempo: uma entrada só, e as duas leem o mesmo horário', async () => {
    const { evento } = await eventoComInscritos(['Ana']);
    const [inscricao] = await inscricoes.todasDoEvento(evento.id);

    const [a, b] = await Promise.all([
      inscricoes.registrarCheckIn(inscricao.id, new Date('2026-10-10T10:00:00Z')),
      inscricoes.registrarCheckIn(inscricao.id, new Date('2026-10-10T10:00:05Z')),
    ]);
    expect(a?.checkInEm).toEqual(b?.checkInEm);
  });

  it('filtra presentes e ausentes, lista os últimos check-ins e desfaz', async () => {
    const { evento } = await eventoComInscritos(['Ana', 'Bia', 'Cid']);
    const [x, y] = await inscricoes.todasDoEvento(evento.id);
    await inscricoes.registrarCheckIn(x.id, new Date('2026-10-10T10:00:00Z'));
    await inscricoes.registrarCheckIn(y.id, new Date('2026-10-10T11:00:00Z'));

    expect((await inscricoes.listarPorEvento(evento.id, { apenasPresentes: true })).total).toBe(2);
    expect((await inscricoes.listarPorEvento(evento.id, { apenasAusentes: true })).total).toBe(1);
    expect((await inscricoes.ultimosCheckIns(evento.id, 5)).map((i) => i.id)).toEqual([y.id, x.id]);

    const desfeito = await inscricoes.desfazerCheckIn(y.id);
    expect(desfeito?.checkInEm).toBeNull();
    expect((await inscricoes.listarPorEvento(evento.id, { apenasPresentes: true })).total).toBe(1);
  });

  it('o relatório de participação agrega as inscrições do evento', async () => {
    const { evento } = await eventoComInscritos(['Ana', 'Bia']);
    const [x] = await inscricoes.todasDoEvento(evento.id);
    await inscricoes.registrarCheckIn(x.id, new Date());

    const relatorio = await relatorioDeParticipacao(catalogo, inscricoes, new Date());
    expect(relatorio.linhas).toHaveLength(1);
    // Lote padrão de 100 vagas: 2 inscritos = 2% de ocupação.
    expect(relatorio.linhas[0]).toMatchObject({
      eventoId: evento.id,
      capacidade: 100,
      inscritos: 2,
      presentes: 1,
      cancelados: 0,
      ocupacaoPercentual: 2,
    });
  });
});

describe('cancelamentos (array embutido na inscrição)', () => {
  it('solicita, lista as pendentes do evento e aprova — inscrição e ingresso ficam cancelados', async () => {
    const { comprador, evento, ingressos } = await eventoComInscritos(['Ana', 'Bia']);
    const ingressoId = ingressos[0].id;

    expect(await solicitarCancelamento(cancelamentos, ingressoId, comprador.id, '  Não vou poder ir ')).toEqual({ ok: true });
    expect(await solicitarCancelamento(cancelamentos, ingressoId, comprador.id, null)).toMatchObject({ ok: false });

    const pendentes = await cancelamentos.listarSolicitadosDoEvento(evento.id);
    expect(pendentes).toHaveLength(1);
    expect(pendentes[0]).toMatchObject({ participanteNome: 'Ana', motivo: 'Não vou poder ir', status: 'solicitado' });

    const aprovado = await cancelamentos.resolver(pendentes[0].id, evento.id, 'aprovado');
    expect(aprovado?.status).toBe('aprovado');
    expect(aprovado?.resolvidoEm).toBeInstanceOf(Date);

    expect(await cancelamentos.buscarContextoDoIngresso(ingressoId)).toMatchObject({ ingressoStatus: 'cancelado' });
    expect((await inscricoes.listarPorEvento(evento.id, { incluirCanceladas: false })).total).toBe(1);
    expect(await cancelamentos.listarSolicitadosDoEvento(evento.id)).toHaveLength(0);

    // Decidir de novo não muda nada.
    expect((await cancelamentos.resolver(pendentes[0].id, evento.id, 'negado'))?.status).toBe('aprovado');
  });

  it('negar mantém o ingresso válido e permite nova solicitação', async () => {
    const { comprador, evento, ingressos } = await eventoComInscritos(['Ana']);
    await solicitarCancelamento(cancelamentos, ingressos[0].id, comprador.id, null);
    const [pendente] = await cancelamentos.listarSolicitadosDoEvento(evento.id);

    await cancelamentos.resolver(pendente.id, evento.id, 'negado');
    expect(await cancelamentos.buscarContextoDoIngresso(ingressos[0].id)).toMatchObject({ ingressoStatus: 'emitido' });
    expect(await solicitarCancelamento(cancelamentos, ingressos[0].id, comprador.id, null)).toEqual({ ok: true });
    expect((await cancelamentos.buscarPorIngresso(ingressos[0].id))?.status).toBe('solicitado');
  });

  it('não deixa outra pessoa cancelar, nem decidir pelo evento errado', async () => {
    const { comprador, evento, ingressos } = await eventoComInscritos(['Ana']);
    const intruso = await criarUsuario();
    expect(await solicitarCancelamento(cancelamentos, ingressos[0].id, intruso.id, null)).toMatchObject({
      ok: false,
      erro: 'Ingresso não encontrado.',
    });

    await solicitarCancelamento(cancelamentos, ingressos[0].id, comprador.id, null);
    const [pendente] = await cancelamentos.listarSolicitadosDoEvento(evento.id);
    const outro = await criarEvento();
    expect(await cancelamentos.resolver(pendente.id, outro.id, 'aprovado')).toBeNull();
  });
});
