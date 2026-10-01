/**
 * Conexão com o MongoDB. Um único `MongoClient` por processo, guardado em
 * `globalThis` para sobreviver ao hot reload do `next dev` (sem isso cada
 * edição abriria um pool novo). O driver gerencia o pool sozinho, tanto no
 * `next start` local quanto em função serverless (Atlas).
 *
 * `MONGODB_DB` escolhe o database — os testes usam `ducktix_test` para não
 * tocar nos dados de desenvolvimento.
 */

import { MongoClient, type Db } from 'mongodb';

const global_ = globalThis as unknown as { __ducktixMongo?: MongoClient };

function cliente(): MongoClient {
  if (global_.__ducktixMongo) return global_.__ducktixMongo;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI não definida — copie .env.example para .env.local.');
  }
  // O driver conecta sozinho na primeira operação; não é preciso `connect()`.
  global_.__ducktixMongo = new MongoClient(uri);
  return global_.__ducktixMongo;
}

export function db(): Db {
  return cliente().db(process.env.MONGODB_DB || 'ducktix');
}

/** Fecha a conexão — usado pelos testes e scripts, nunca pela aplicação. */
export async function fecharConexao(): Promise<void> {
  await global_.__ducktixMongo?.close();
  global_.__ducktixMongo = undefined;
}
