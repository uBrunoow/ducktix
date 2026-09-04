import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { cupom as cupomTabela, cupomEvento, usoDeCupom as usoDeCupomTabela } from '@/server/db/schema';
import type { Cupom, TipoDesconto, UsoDeCupom } from '../domain/cupom';
import type { CupomRepository, DadosDeNovoCupom, DadosDeUsoDeCupom } from '../ports/cupons';

type LinhaDeCupom = typeof cupomTabela.$inferSelect;

async function paraCupom(linha: LinhaDeCupom): Promise<Cupom> {
  const restricoes = await db
    .select({ eventoId: cupomEvento.eventoId })
    .from(cupomEvento)
    .where(eq(cupomEvento.cupomId, linha.id));

  return {
    id: linha.id,
    codigo: linha.codigo,
    tipoDesconto: linha.tipoDesconto as TipoDesconto,
    valor: linha.valor,
    validoDe: linha.validoDe,
    validoAte: linha.validoAte,
    limiteDeUso: linha.limiteUso,
    usos: linha.usos,
    eventosIds: restricoes.map((r) => r.eventoId),
    ativo: linha.ativo,
    criadoEm: linha.criadoEm,
  };
}

class DrizzleCupomRepository implements CupomRepository {
  async buscarPorCodigo(codigo: string): Promise<Cupom | null> {
    const [linha] = await db
      .select()
      .from(cupomTabela)
      .where(eq(cupomTabela.codigo, codigo.trim().toUpperCase()))
      .limit(1);
    return linha ? paraCupom(linha) : null;
  }

  async buscarPorId(cupomId: string): Promise<Cupom | null> {
    const [linha] = await db.select().from(cupomTabela).where(eq(cupomTabela.id, cupomId)).limit(1);
    return linha ? paraCupom(linha) : null;
  }

  async listarTodos(): Promise<readonly Cupom[]> {
    const linhas = await db.select().from(cupomTabela).orderBy(desc(cupomTabela.criadoEm));
    return Promise.all(linhas.map(paraCupom));
  }

  async criar(dados: DadosDeNovoCupom): Promise<Cupom> {
    const cupomId = await db.transaction(async (tx) => {
      const [linha] = await tx
        .insert(cupomTabela)
        .values({
          codigo: dados.codigo.trim().toUpperCase(),
          tipoDesconto: dados.tipoDesconto,
          valor: dados.valor,
          validoDe: dados.validoDe,
          validoAte: dados.validoAte,
          limiteUso: dados.limiteDeUso,
        })
        .returning({ id: cupomTabela.id });

      if (dados.eventosIds.length > 0) {
        await tx
          .insert(cupomEvento)
          .values(dados.eventosIds.map((eventoId) => ({ cupomId: linha.id, eventoId })));
      }

      return linha.id;
    });

    const cupom = await this.buscarPorId(cupomId);
    if (!cupom) throw new Error('Falha ao criar cupom.');
    return cupom;
  }

  async definirAtivo(cupomId: string, ativo: boolean): Promise<void> {
    await db.update(cupomTabela).set({ ativo }).where(eq(cupomTabela.id, cupomId));
  }

  /** Uso + contador na mesma transação — os dois sempre andam juntos (ver
   *  contrato do port). */
  async registrarUso(dados: DadosDeUsoDeCupom): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.insert(usoDeCupomTabela).values({
        cupomId: dados.cupomId,
        pedidoId: dados.pedidoId,
        eventoId: dados.eventoId,
        descontoCentavos: dados.descontoCentavos,
      });
      await tx
        .update(cupomTabela)
        .set({ usos: sql`${cupomTabela.usos} + 1` })
        .where(eq(cupomTabela.id, dados.cupomId));
    });
  }

  async listarUsos(cupomId: string): Promise<readonly UsoDeCupom[]> {
    const linhas = await db
      .select()
      .from(usoDeCupomTabela)
      .where(eq(usoDeCupomTabela.cupomId, cupomId))
      .orderBy(desc(usoDeCupomTabela.usadoEm));
    return linhas.map((l) => ({
      id: l.id,
      cupomId: l.cupomId,
      pedidoId: l.pedidoId,
      eventoId: l.eventoId,
      descontoCentavos: l.descontoCentavos,
      usadoEm: l.usadoEm,
    }));
  }

  async listarUsosPorEvento(eventoId: string): Promise<readonly UsoDeCupom[]> {
    const linhas = await db
      .select()
      .from(usoDeCupomTabela)
      .where(eq(usoDeCupomTabela.eventoId, eventoId))
      .orderBy(desc(usoDeCupomTabela.usadoEm));
    return linhas.map((l) => ({
      id: l.id,
      cupomId: l.cupomId,
      pedidoId: l.pedidoId,
      eventoId: l.eventoId,
      descontoCentavos: l.descontoCentavos,
      usadoEm: l.usadoEm,
    }));
  }
}

export const drizzleCupomRepository: CupomRepository = new DrizzleCupomRepository();
