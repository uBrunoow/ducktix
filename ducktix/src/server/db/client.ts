/**
 * Factory de conexão. Dev usa o driver `postgres` (postgres.js) contra o
 * Postgres do docker-compose; produção (Vercel) usa `@neondatabase/serverless`
 * sobre HTTP, que não abre socket TCP persistente — obrigatório em runtime
 * serverless. A troca é por `NODE_ENV`, não por sniff de connection string,
 * porque o Neon também aceita conexão TCP direta (não queremos escolher o
 * driver errado em dev contra um DATABASE_URL do Neon).
 *
 * `db` é tipado como `PostgresJsDatabase` sempre, mesmo quando o cliente real
 * é o `neon-http` — os dois implementam a mesma API de query builder que os
 * repositórios usam. A exceção é transação/`SELECT ... FOR UPDATE`
 * (`registrarVenda` em ticketing, por exemplo): `neon-http` não sustenta
 * sessão entre queries, então não suporta nenhum dos dois. Isso não trava o
 * dev (roda contra `postgres.js` de verdade) nem o tipo — só significa que
 * produção em Neon precisa trocar para `@neondatabase/serverless` com
 * WebSocket (`neon-serverless` + `Pool`) antes do deploy da Fase 2, se a
 * concorrência da venda for exercida lá.
 */

import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { neon } from '@neondatabase/serverless';
import postgres from 'postgres';
import * as schema from './schema';

function criarDb(): PostgresJsDatabase<typeof schema> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida — copie .env.example para .env.local.');
  }

  if (process.env.NODE_ENV === 'production') {
    const sql = neon(connectionString);
    return drizzleNeon({ client: sql, schema }) as unknown as PostgresJsDatabase<typeof schema>;
  }

  const sql = postgres(connectionString);
  return drizzlePostgres({ client: sql, schema });
}

const global_ = globalThis as unknown as { __ducktixDb?: PostgresJsDatabase<typeof schema> };

export const db = global_.__ducktixDb ?? (global_.__ducktixDb = criarDb());
