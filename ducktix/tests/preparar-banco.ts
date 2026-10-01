import { MongoClient } from 'mongodb';
import { criarBanco } from '../database/scripts/criar-banco.mjs';

/**
 * Antes de toda a suíte: apaga o `ducktix_test` e o recria com o mesmo
 * script da entrega (`database/criar-banco.js`). Assim os testes também
 * passam pelos validadores `$jsonSchema` e pelos índices únicos.
 */
export default async function prepararBanco(): Promise<void> {
  const cliente = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://localhost:27017');
  try {
    await cliente.connect();
    const db = cliente.db('ducktix_test');
    await db.dropDatabase();
    await criarBanco(db, () => {});
  } finally {
    await cliente.close();
  }
}
