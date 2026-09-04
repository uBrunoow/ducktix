import { randomUUID } from 'node:crypto';
import { and, asc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import {
  categoria as categoriaTabela,
  evento as eventoTabela,
  eventoCategoria,
  lote as loteTabela,
  organizador as organizadorTabela,
} from '@/server/db/schema';
import { EventoNaoEncontradoError } from '../domain/erros';
import { gerarSlug, type Evento, type Lote } from '../domain/evento';
import type {
  CatalogoPublicoRepository,
  DadosDeEdicaoDeEvento,
  DadosDeNovoEvento,
} from '../ports/catalogo-publico';

type LinhaDeEvento = typeof eventoTabela.$inferSelect & {
  organizadorNome: string;
  organizadorUsuarioId: string | null;
};
type LinhaDeLote = typeof loteTabela.$inferSelect;

function paraLote(linha: LinhaDeLote): Lote {
  return {
    id: linha.id,
    nome: linha.nome,
    precoCentavos: linha.precoCentavos,
    vagas: linha.vagas,
    vendidos: linha.vendidos,
    iniciaEm: linha.iniciaEm,
    encerraEm: linha.encerraEm,
  };
}

function montarEvento(
  linha: LinhaDeEvento,
  categoriaNome: string,
  lotes: readonly Lote[],
): Evento {
  return {
    id: linha.id,
    slug: linha.slug,
    nome: linha.nome,
    organizador: linha.organizadorNome,
    organizadorUsuarioId: linha.organizadorUsuarioId,
    categoria: categoriaNome,
    modalidade: linha.modalidade as Evento['modalidade'],
    local: linha.local,
    comecaEm: linha.comecaEm,
    terminaEm: linha.terminaEm,
    descricao: linha.descricao,
    lotes,
    status: linha.status as Evento['status'],
    visibilidade: linha.visibilidade as Evento['visibilidade'],
    formatoOnline: linha.formatoOnline as Evento['formatoOnline'],
    imagemUrl: linha.imagemUrl,
  };
}

/** Junta linhas de evento (1 por id) com seus lotes e sua categoria — feito
 *  em memória, não em SQL, porque um LEFT JOIN direto em `evento_categoria`
 *  explodiria em N linhas por evento com mais de uma categoria (o schema
 *  modela N:N; o domínio só expõe uma). Ver docs/modelo-mudancas.md, seção 7. */
async function montarEventos(linhas: readonly LinhaDeEvento[]): Promise<Evento[]> {
  if (linhas.length === 0) return [];
  const ids = linhas.map((l) => l.id);

  const [linhasDeCategoria, linhasDeLote] = await Promise.all([
    db
      .select({ eventoId: eventoCategoria.eventoId, nome: categoriaTabela.nome })
      .from(eventoCategoria)
      .innerJoin(categoriaTabela, eq(categoriaTabela.id, eventoCategoria.categoriaId))
      .where(inArray(eventoCategoria.eventoId, ids))
      .orderBy(asc(categoriaTabela.nome)),
    db
      .select()
      .from(loteTabela)
      .where(inArray(loteTabela.eventoId, ids))
      .orderBy(asc(loteTabela.ordem)),
  ]);

  const categoriaPorEvento = new Map<string, string>();
  for (const linha of linhasDeCategoria) {
    if (!categoriaPorEvento.has(linha.eventoId)) {
      categoriaPorEvento.set(linha.eventoId, linha.nome);
    }
  }

  const lotesPorEvento = new Map<string, Lote[]>();
  for (const linha of linhasDeLote) {
    const lista = lotesPorEvento.get(linha.eventoId) ?? [];
    lista.push(paraLote(linha));
    lotesPorEvento.set(linha.eventoId, lista);
  }

  return linhas.map((linha) =>
    montarEvento(
      linha,
      categoriaPorEvento.get(linha.id) ?? '',
      lotesPorEvento.get(linha.id) ?? [],
    ),
  );
}

const SELECAO_DE_EVENTO = {
  id: eventoTabela.id,
  slug: eventoTabela.slug,
  nome: eventoTabela.nome,
  organizadorId: eventoTabela.organizadorId,
  descricao: eventoTabela.descricao,
  local: eventoTabela.local,
  modalidade: eventoTabela.modalidade,
  formatoOnline: eventoTabela.formatoOnline,
  status: eventoTabela.status,
  visibilidade: eventoTabela.visibilidade,
  comecaEm: eventoTabela.comecaEm,
  terminaEm: eventoTabela.terminaEm,
  imagemUrl: eventoTabela.imagemUrl,
  criadoEm: eventoTabela.criadoEm,
  organizadorNome: organizadorTabela.nomeFantasia,
  organizadorUsuarioId: organizadorTabela.usuarioId,
} as const;

function baseSelectDeEventos() {
  return db
    .select(SELECAO_DE_EVENTO)
    .from(eventoTabela)
    .innerJoin(organizadorTabela, eq(organizadorTabela.id, eventoTabela.organizadorId));
}

/**
 * Resolve o `organizador_id` do usuário logado — cria a linha de
 * `organizador` no primeiro evento dele (find-or-create por `usuario_id`,
 * não por nome: nome pode repetir entre contas, id nunca). Ver
 * docs/modelo-mudancas.md, seção 7.
 */
async function resolverOrganizadorIdPorUsuario(
  tx: typeof db,
  usuarioId: string,
  nomeDeExibicao: string,
): Promise<string> {
  const [existente] = await tx
    .select({ id: organizadorTabela.id })
    .from(organizadorTabela)
    .where(eq(organizadorTabela.usuarioId, usuarioId))
    .limit(1);
  if (existente) return existente.id;

  const [criado] = await tx
    .insert(organizadorTabela)
    .values({ usuarioId, nomeFantasia: nomeDeExibicao })
    .returning({ id: organizadorTabela.id });
  return criado.id;
}

async function resolverCategoriaId(tx: typeof db, nome: string): Promise<string> {
  const [linha] = await tx
    .select({ id: categoriaTabela.id })
    .from(categoriaTabela)
    .where(eq(categoriaTabela.nome, nome))
    .limit(1);
  if (!linha) {
    throw new EventoNaoEncontradoError();
  }
  return linha.id;
}

async function gerarSlugUnico(tx: typeof db, nome: string): Promise<string> {
  const base = gerarSlug(nome) || 'evento';
  let slug = base;
  let sufixo = 1;
  for (;;) {
    const [existente] = await tx
      .select({ id: eventoTabela.id })
      .from(eventoTabela)
      .where(eq(eventoTabela.slug, slug))
      .limit(1);
    if (!existente) return slug;
    sufixo += 1;
    slug = `${base}-${sufixo}`;
  }
}

class DrizzleCatalogoPublicoRepository implements CatalogoPublicoRepository {
  async listarPublicados(inicio: Date, fim: Date): Promise<readonly Evento[]> {
    const linhas = await baseSelectDeEventos()
      .where(
        and(
          eq(eventoTabela.status, 'publicado'),
          gte(eventoTabela.comecaEm, inicio),
          lt(eventoTabela.comecaEm, fim),
        ),
      )
      .orderBy(asc(eventoTabela.comecaEm));
    return montarEventos(linhas);
  }

  async listarTodos(): Promise<readonly Evento[]> {
    const linhas = await baseSelectDeEventos().orderBy(asc(eventoTabela.comecaEm));
    return montarEventos(linhas);
  }

  async buscarPorId(eventoId: string): Promise<Evento | null> {
    const linhas = await baseSelectDeEventos().where(eq(eventoTabela.id, eventoId)).limit(1);
    const eventos = await montarEventos(linhas);
    return eventos[0] ?? null;
  }

  async listarDoOrganizador(organizadorUsuarioId: string): Promise<readonly Evento[]> {
    const linhas = await baseSelectDeEventos()
      .where(eq(organizadorTabela.usuarioId, organizadorUsuarioId))
      .orderBy(asc(eventoTabela.comecaEm));
    return montarEventos(linhas);
  }

  /**
   * `SELECT ... FOR UPDATE` na linha do lote dentro da transação: é o ponto
   * de concorrência da venda (dois compradores confirmando pedido pro mesmo
   * lote ao mesmo tempo não podem os dois passar do estoque). O driver
   * `postgres` (dev) suporta transação interativa; o driver `neon-http`
   * (produção) não — ver nota em `src/server/db/client.ts` quando a Fase 2
   * migrar para lá.
   */
  async registrarVenda(_eventoId: string, loteId: string, quantidade: number): Promise<void> {
    await db.transaction(async (tx) => {
      const [linha] = await tx
        .select({ vagas: loteTabela.vagas, vendidos: loteTabela.vendidos })
        .from(loteTabela)
        .where(eq(loteTabela.id, loteId))
        .for('update');

      if (!linha || linha.vendidos + quantidade > linha.vagas) {
        throw new Error('Estoque insuficiente para registrar a venda.');
      }

      await tx
        .update(loteTabela)
        .set({ vendidos: sql`${loteTabela.vendidos} + ${quantidade}` })
        .where(eq(loteTabela.id, loteId));
    });
  }

  async criar(dados: DadosDeNovoEvento): Promise<Evento> {
    const eventoId = await db.transaction(async (tx) => {
      const [organizadorId, categoriaId, slug] = await Promise.all([
        resolverOrganizadorIdPorUsuario(tx, dados.organizadorUsuarioId, dados.organizador),
        resolverCategoriaId(tx, dados.categoria),
        gerarSlugUnico(tx, dados.nome),
      ]);

      const [linha] = await tx
        .insert(eventoTabela)
        .values({
          organizadorId,
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
        })
        .returning({ id: eventoTabela.id });

      await tx.insert(eventoCategoria).values({ eventoId: linha.id, categoriaId });

      if (dados.lotes.length > 0) {
        await tx.insert(loteTabela).values(
          dados.lotes.map((lote, indice) => ({
            eventoId: linha.id,
            nome: lote.nome,
            precoCentavos: lote.precoCentavos,
            vagas: lote.vagas,
            iniciaEm: lote.iniciaEm,
            encerraEm: lote.encerraEm,
            ordem: indice,
          })),
        );
      }

      return linha.id;
    });

    const evento = await this.buscarPorId(eventoId);
    if (!evento) throw new EventoNaoEncontradoError();
    return evento;
  }

  async publicar(eventoId: string): Promise<void> {
    await db.update(eventoTabela).set({ status: 'publicado' }).where(eq(eventoTabela.id, eventoId));
  }

  async despublicar(eventoId: string): Promise<void> {
    await db.update(eventoTabela).set({ status: 'rascunho' }).where(eq(eventoTabela.id, eventoId));
  }

  async cancelar(eventoId: string): Promise<void> {
    await db.update(eventoTabela).set({ status: 'cancelado' }).where(eq(eventoTabela.id, eventoId));
  }

  async excluir(eventoId: string): Promise<void> {
    await db.delete(eventoTabela).where(eq(eventoTabela.id, eventoId));
  }

  async atualizar(eventoId: string, dados: DadosDeEdicaoDeEvento): Promise<Evento> {
    await db.transaction(async (tx) => {
      const categoriaId = await resolverCategoriaId(tx, dados.categoria);

      const [atualizado] = await tx
        .update(eventoTabela)
        .set({
          nome: dados.nome,
          descricao: dados.descricao,
          local: dados.local,
          modalidade: dados.modalidade,
          formatoOnline: dados.formatoOnline,
          visibilidade: dados.visibilidade,
          comecaEm: dados.comecaEm,
          terminaEm: dados.terminaEm,
          imagemUrl: dados.imagemUrl,
        })
        .where(eq(eventoTabela.id, eventoId))
        .returning({ id: eventoTabela.id });

      if (!atualizado) throw new EventoNaoEncontradoError();

      await tx.delete(eventoCategoria).where(eq(eventoCategoria.eventoId, eventoId));
      await tx.insert(eventoCategoria).values({ eventoId, categoriaId });
    });

    const evento = await this.buscarPorId(eventoId);
    if (!evento) throw new EventoNaoEncontradoError();
    return evento;
  }
}

export const drizzleCatalogoPublicoRepository: CatalogoPublicoRepository =
  new DrizzleCatalogoPublicoRepository();
