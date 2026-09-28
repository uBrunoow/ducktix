/**
 * Factory de conexão. Local (dev ou `next start`) usa o driver `postgres`
 * (postgres.js) contra o Postgres do docker-compose; na Vercel usa
 * `@neondatabase/serverless`, que não abre socket TCP persistente —
 * obrigatório em runtime serverless. A troca é pela variável `VERCEL`, que a
 * própria Vercel define no build e no runtime — não por `NODE_ENV`, que também
 * é `production` num `next start` local, nem por sniff de connection string,
 * porque o Neon também aceita conexão TCP direta.
 *
 * `db` é tipado como `PostgresJsDatabase` sempre. Em produção, o Pool do
 * Neon mantém a sessão necessária para transações e `SELECT ... FOR UPDATE`.
 */

import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Pool } from '@neondatabase/serverless';
import postgres from 'postgres';
import * as schema from './schema';

function criarDb(): PostgresJsDatabase<typeof schema> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida — copie .env.example para .env.local.');
  }

  if (process.env.VERCEL) {
    const pool = new Pool({ connectionString });
    return drizzleNeon({ client: pool, schema }) as unknown as PostgresJsDatabase<typeof schema>;
  }

  const sql = postgres(connectionString);
  return drizzlePostgres({ client: sql, schema });
}

const global_ = globalThis as unknown as { __ducktixDb?: PostgresJsDatabase<typeof schema> };

export const db = global_.__ducktixDb ?? (global_.__ducktixDb = criarDb());
