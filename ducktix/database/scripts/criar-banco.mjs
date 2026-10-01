/**
 * Executa `database/criar-banco.js` pelo driver Node, para quem não tem
 * `mongosh` instalado (ou usa o MongoDB Atlas). O arquivo é o mesmo que roda
 * no `mongosh`: aqui só oferecemos um `db` com os quatro métodos que ele usa.
 *
 * Uso:  pnpm db:setup
 *       MONGODB_DB=ducktix_test node database/scripts/criar-banco.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import { carregarAmbiente } from './ambiente.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));

export async function criarBanco(dbDriver, print = console.log) {
  // O arquivo é escrito no estilo síncrono do mongosh; aqui cada chamada a
  // `db.` ganha um `await` para rodar sobre o driver, que é assíncrono.
  const fonte = readFileSync(join(aqui, '..', 'criar-banco.js'), 'utf8').replace(
    /(?<![\w.])db\./g,
    'await db.',
  );
  const db = {
    getCollectionNames: async () =>
      (await dbDriver.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name),
    createCollection: (nome, opcoes) => dbDriver.createCollection(nome, opcoes),
    runCommand: (comando) => dbDriver.command(comando),
    getCollection: (nome) => dbDriver.collection(nome),
  };
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  await new AsyncFunction('db', 'print', fonte)(db, print);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { uri, nomeDoBanco } = carregarAmbiente();
  const cliente = new MongoClient(uri);
  try {
    await cliente.connect();
    console.log(`Criando o banco "${nomeDoBanco}"…`);
    await criarBanco(cliente.db(nomeDoBanco));
  } finally {
    await cliente.close();
  }
}
