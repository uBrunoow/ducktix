import { randomUUID } from 'node:crypto';
import type { Filter } from 'mongodb';
import { colecoes, type EventoDoc, type LoteDoc } from '@/server/db/colecoes';
import { EventoNaoEncontradoError } from '../domain/erros';
import { gerarSlug, type Evento, type Lote } from '../domain/evento';
import type {
  CatalogoPublicoRepository,
  DadosDeEdicaoDeEvento,
  DadosDeNovoLote,
  DadosDeNovoEvento,
} from '../ports/catalogo-publico';

function paraLote(doc: LoteDoc): Lote {
  return {
    id: doc._id,
    nome: doc.nome,
    precoCentavos: doc.precoCentavos,
    vagas: doc.vagas,
    vendidos: doc.vendidos,
    iniciaEm: doc.iniciaEm,
    encerraEm: doc.encerraEm,
  };
}

/**
 * Um documento de `eventos` já traz lotes, categorias e o nome do
 * organizador — o que no Postgres exigia JOIN com `organizador` e duas
 * consultas extras (`lote`, `evento_categoria`) agora é uma leitura só.
 */
function paraEvento(doc: EventoDoc): Evento {
  // O modelo guarda N categorias; o domínio expõe uma — a primeira em ordem
  // alfabética, a mesma regra do repositório SQL.
  const [categoria] = doc.categorias.map((c) => c.nome).sort((a, b) => a.localeCompare(b));
  return {
    id: doc._id,
    slug: doc.slug,
    nome: doc.nome,
    organizador: doc.organizador.nome,
    organizadorUsuarioId: doc.organizador.usuarioId,
    categoria: categoria ?? '',
    modalidade: doc.modalidade as Evento['modalidade'],
    local: doc.local,
    comecaEm: doc.comecaEm,
    terminaEm: doc.terminaEm,
    descricao: doc.descricao,
    lotes: [...doc.lotes].sort((a, b) => a.ordem - b.ordem).map(paraLote),
    status: doc.status as Evento['status'],
    visibilidade: doc.visibilidade as Evento['visibilidade'],
    formatoOnline: doc.formatoOnline as Evento['formatoOnline'],
    imagemUrl: doc.imagemUrl,
    isHighlighted: doc.isHighlighted,
  };
}

async function listar(filtro: Filter<EventoDoc>): Promise<Evento[]> {
  const docs = await colecoes.eventos().find(filtro).sort({ comecaEm: 1 }).toArray();
  return docs.map(paraEvento);
}

/**
 * Resolve o organizador do usuário logado — cria o subdocumento
 * `organizador` no primeiro evento dele. O `findOneAndUpdate` com filtro
 * `organizador: null` é o find-or-create atômico: duas criações simultâneas
 * não geram dois organizadores para a mesma conta.
 */
async function resolverOrganizador(
  usuarioId: string,
  nomeDeExibicao: string,
): Promise<EventoDoc['organizador']> {
  const usuarios = colecoes.usuarios();
  const usuario =
    (await usuarios.findOneAndUpdate(
      { _id: usuarioId, organizador: null },
      {
        $set: {
          organizador: {
            id: randomUUID(),
            nomeFantasia: nomeDeExibicao,
            documento: null,
            emailContato: null,
          },
        },
      },
      { returnDocument: 'after' },
    )) ?? (await usuarios.findOne({ _id: usuarioId }));
  if (!usuario?.organizador) throw new Error('Usuário organizador não encontrado.');
  return { id: usuario.organizador.id, usuarioId, nome: usuario.organizador.nomeFantasia };
}

async function resolverCategoria(nome: string): Promise<{ id: string; nome: string }> {
  const categoria = await colecoes.categorias().findOne({ nome });
  if (!categoria) throw new EventoNaoEncontradoError();
  return { id: categoria._id, nome: categoria.nome };
}

async function gerarSlugUnico(nome: string): Promise<string> {
  const base = gerarSlug(nome) || 'evento';
  let slug = base;
  let sufixo = 1;
  while (await colecoes.eventos().countDocuments({ slug }, { limit: 1 })) {
    sufixo += 1;
    slug = `${base}-${sufixo}`;
  }
  return slug;
}

async function buscarOuFalhar(eventoId: string): Promise<Evento> {
  const doc = await colecoes.eventos().findOne({ _id: eventoId });
  if (!doc) throw new EventoNaoEncontradoError();
  return paraEvento(doc);
}

class MongoCatalogoPublicoRepository implements CatalogoPublicoRepository {
  async listarCategorias(): Promise<readonly string[]> {
    const docs = await colecoes.categorias().find().sort({ nome: 1 }).toArray();
    return docs.map((doc) => doc.nome);
  }

  listarPublicados(inicio: Date, fim: Date): Promise<readonly Evento[]> {
    return listar({ status: 'publicado', comecaEm: { $gte: inicio, $lt: fim } });
  }

  listarTodos(): Promise<readonly Evento[]> {
    return listar({});
  }

  async buscarPorId(eventoId: string): Promise<Evento | null> {
    const doc = await colecoes.eventos().findOne({ _id: eventoId });
    return doc ? paraEvento(doc) : null;
  }

  listarDoOrganizador(organizadorUsuarioId: string): Promise<readonly Evento[]> {
    return listar({ 'organizador.usuarioId': organizadorUsuarioId });
  }

  /**
   * Ponto de concorrência da venda: substitui o `SELECT ... FOR UPDATE`.
   * O `updateOne` só casa se o lote ainda tiver estoque para `quantidade`
   * (`vendidos <= vagas - quantidade`), e o `$inc` acontece na mesma operação
   * atômica do documento — dois compradores simultâneos não passam juntos
   * do limite, porque o segundo não casa mais o filtro.
   */
  async registrarVenda(eventoId: string, loteId: string, quantidade: number): Promise<void> {
    const evento = await colecoes.eventos().findOne(
      { _id: eventoId, 'lotes._id': loteId },
      { projection: { 'lotes.$': 1 } },
    );
    const lote = evento?.lotes[0];
    if (!lote) throw new Error('Estoque insuficiente para registrar a venda.');

    const resultado = await colecoes.eventos().updateOne(
      {
        _id: eventoId,
        lotes: {
          $elemMatch: { _id: loteId, vagas: lote.vagas, vendidos: { $lte: lote.vagas - quantidade } },
        },
      },
      { $inc: { 'lotes.$.vendidos': quantidade } },
    );
    if (resultado.modifiedCount === 0) {
      throw new Error('Estoque insuficiente para registrar a venda.');
    }
  }

  async criar(dados: DadosDeNovoEvento): Promise<Evento> {
    // Categoria primeiro: se ela não existir, nada é gravado — inclusive o
    // organizador, como acontecia com o rollback da transação no Postgres.
    const [categoria, slug] = await Promise.all([
      resolverCategoria(dados.categoria),
      gerarSlugUnico(dados.nome),
    ]);
    const organizador = await resolverOrganizador(dados.organizadorUsuarioId, dados.organizador);

    const doc: EventoDoc = {
      _id: randomUUID(),
      slug,
      nome: dados.nome,
      descricao: dados.descricao,
      local: dados.local,
      modalidade: dados.modalidade,
      formatoOnline: dados.formatoOnline,
      status: 'rascunho',
      visibilidade: dados.visibilidade,
      comecaEm: dados.comecaEm,
      terminaEm: dados.terminaEm,
      imagemUrl: dados.imagemUrl,
      isHighlighted: false,
      criadoEm: new Date(),
      organizador,
      categorias: [categoria],
      lotes: dados.lotes.map((lote, indice) => ({
        _id: randomUUID(),
        nome: lote.nome,
        precoCentavos: lote.precoCentavos,
        vagas: lote.vagas,
        vendidos: 0,
        iniciaEm: lote.iniciaEm,
        encerraEm: lote.encerraEm,
        ordem: indice,
      })),
    };
    // Evento, lotes e categoria num único insert — no Postgres eram três
    // INSERTs dentro de uma transação.
    await colecoes.eventos().insertOne(doc);
    return paraEvento(doc);
  }

  private async definirStatus(eventoId: string, status: EventoDoc['status']): Promise<void> {
    await colecoes.eventos().updateOne({ _id: eventoId }, { $set: { status } });
  }

  publicar(eventoId: string): Promise<void> {
    return this.definirStatus(eventoId, 'publicado');
  }

  despublicar(eventoId: string): Promise<void> {
    return this.definirStatus(eventoId, 'rascunho');
  }

  cancelar(eventoId: string): Promise<void> {
    return this.definirStatus(eventoId, 'cancelado');
  }

  /** Lotes e categorias saem junto com o documento. O vínculo com cupons
   *  (antigo `ON DELETE CASCADE` de `cupom_evento`) é desfeito à mão. Um
   *  evento que já está em algum pedido não sai — era a FK
   *  `item_pedido.lote_id` (sem cascade) que barrava isso no PostgreSQL. */
  async excluir(eventoId: string): Promise<void> {
    if (await colecoes.pedidos().countDocuments({ 'itens.eventoId': eventoId }, { limit: 1 })) {
      throw new Error('Este evento está em pedidos e não pode ser excluído — cancele em vez de excluir.');
    }
    await colecoes.eventos().deleteOne({ _id: eventoId });
    await colecoes.cupons().updateMany({ eventosIds: eventoId }, { $pull: { eventosIds: eventoId } });
  }

  async atualizar(eventoId: string, dados: DadosDeEdicaoDeEvento): Promise<Evento> {
    const categoria = await resolverCategoria(dados.categoria);
    const doc = await colecoes.eventos().findOneAndUpdate(
      { _id: eventoId },
      {
        $set: {
          nome: dados.nome,
          descricao: dados.descricao,
          local: dados.local,
          modalidade: dados.modalidade,
          formatoOnline: dados.formatoOnline,
          visibilidade: dados.visibilidade,
          comecaEm: dados.comecaEm,
          terminaEm: dados.terminaEm,
          imagemUrl: dados.imagemUrl,
          categorias: [categoria],
        },
      },
      { returnDocument: 'after' },
    );
    if (!doc) throw new EventoNaoEncontradoError();
    return paraEvento(doc);
  }

  async adicionarLote(eventoId: string, dados: DadosDeNovoLote): Promise<Evento> {
    const evento = await colecoes.eventos().findOne({ _id: eventoId }, { projection: { lotes: 1 } });
    if (!evento) throw new EventoNaoEncontradoError();
    const ordem = Math.max(-1, ...evento.lotes.map((l) => l.ordem)) + 1;

    // `lotes.nome: {$ne}` no filtro garante o antigo UNIQUE (evento_id, nome)
    // na mesma operação do `$push`.
    const resultado = await colecoes.eventos().updateOne(
      { _id: eventoId, 'lotes.nome': { $ne: dados.nome } },
      {
        $push: {
          lotes: {
            _id: randomUUID(),
            nome: dados.nome,
            precoCentavos: dados.precoCentavos,
            vagas: dados.vagas,
            vendidos: 0,
            iniciaEm: dados.iniciaEm,
            encerraEm: dados.encerraEm,
            ordem,
          },
        },
      },
    );
    if (resultado.matchedCount === 0) {
      throw new Error('Já existe um lote com este nome neste evento.');
    }
    return buscarOuFalhar(eventoId);
  }

  async atualizarLote(eventoId: string, loteId: string, dados: DadosDeNovoLote): Promise<Evento> {
    const evento = await colecoes.eventos().findOne({ _id: eventoId, 'lotes._id': loteId });
    const lote = evento?.lotes.find((l) => l._id === loteId);
    if (!evento || !lote) throw new EventoNaoEncontradoError();
    if (lote.vendidos > 0) throw new Error('Este lote já possui ingressos vendidos e não pode ser editado.');
    if (evento.lotes.some((l) => l._id !== loteId && l.nome === dados.nome)) {
      throw new Error('Já existe um lote com este nome neste evento.');
    }

    // `vendidos: 0` no filtro: se uma venda entrar entre a leitura e a
    // escrita, a edição não acontece (a regra "lote com venda não muda").
    const resultado = await colecoes.eventos().updateOne(
      { _id: eventoId, lotes: { $elemMatch: { _id: loteId, vendidos: 0 } } },
      {
        $set: {
          'lotes.$.nome': dados.nome,
          'lotes.$.precoCentavos': dados.precoCentavos,
          'lotes.$.vagas': dados.vagas,
          'lotes.$.iniciaEm': dados.iniciaEm,
          'lotes.$.encerraEm': dados.encerraEm,
        },
      },
    );
    if (resultado.matchedCount === 0) {
      throw new Error('Este lote já possui ingressos vendidos e não pode ser editado.');
    }
    return buscarOuFalhar(eventoId);
  }

  async excluirLote(eventoId: string, loteId: string): Promise<void> {
    const evento = await colecoes.eventos().findOne({ _id: eventoId }, { projection: { lotes: 1 } });
    if (!evento || evento.lotes.length <= 1) {
      throw new Error('O evento precisa manter ao menos um lote de ingresso.');
    }
    const lote = evento.lotes.find((l) => l._id === loteId);
    if (!lote) throw new EventoNaoEncontradoError();
    if (lote.vendidos > 0) throw new Error('Este lote já possui ingressos vendidos e não pode ser excluído.');
    // Papel da antiga FK `item_pedido.lote_id` (sem cascade): um lote que já
    // está em algum carrinho não some, senão a emissão do ingresso quebraria.
    if (await colecoes.pedidos().countDocuments({ 'itens.loteId': loteId }, { limit: 1 })) {
      throw new Error('Este lote está em pedidos e não pode ser excluído.');
    }

    // Mesmas garantias no filtro do `$pull`: ainda sem venda e ainda com
    // outro lote no evento.
    const resultado = await colecoes.eventos().updateOne(
      { _id: eventoId, 'lotes.1': { $exists: true } },
      { $pull: { lotes: { _id: loteId, vendidos: 0 } } },
    );
    if (resultado.modifiedCount === 0) {
      throw new Error('Este lote já possui ingressos vendidos e não pode ser excluído.');
    }
  }
}

export const mongoCatalogoPublicoRepository: CatalogoPublicoRepository =
  new MongoCatalogoPublicoRepository();
