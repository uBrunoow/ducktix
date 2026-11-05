/**
 * Confere se o MongoDB ficou igual ao dump do PostgreSQL de origem.
 *
 * O esperado sai da mesma conversão usada pelo seed, aplicada ao dump; o obtido
 * é lido do banco. Só faz leituras. Sai com código 1 se algo divergir.
 *
 * Uso:  pnpm db:conferir --arquivo <dump.sql>
 */

import { readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';
import { carregarAmbiente } from './ambiente.mjs';
import { arquivoDosArgumentos, converterBackup } from './seed.mjs';

const somarVendidos = (eventos) =>
  eventos.reduce((total, e) => total + e.lotes.reduce((s, l) => s + l.vendidos, 0), 0);

const somarUsosDeCupom = (cupons) => cupons.reduce((total, c) => total + c.usos, 0);

const { uri, nomeDoBanco } = carregarAmbiente();
const arquivo = arquivoDosArgumentos(process.argv.slice(2));
const esperado = converterBackup(readFileSync(arquivo, 'utf8'));
const cliente = new MongoClient(uri);

try {
  await cliente.connect();
  const db = cliente.db(nomeDoBanco);

  const linhas = [];
  for (const [nome, documentos] of Object.entries(esperado)) {
    linhas.push([nome, documentos.length, await db.collection(nome).countDocuments()]);
  }

  const contar = (documentos, predicado) => documentos.filter(predicado).length;
  linhas.push(
    [
      'inscrições ativas',
      contar(esperado.inscricoes, (i) => i.status === 'ativa'),
      await db.collection('inscricoes').countDocuments({ status: 'ativa' }),
    ],
    [
      'check-ins',
      contar(esperado.inscricoes, (i) => i.checkIn !== null),
      await db.collection('inscricoes').countDocuments({ checkIn: { $ne: null } }),
    ],
    [
      'pedidos confirmados',
      contar(esperado.pedidos, (p) => p.status === 'confirmado'),
      await db.collection('pedidos').countDocuments({ status: 'confirmado' }),
    ],
    [
      'soma de lotes.vendidos',
      somarVendidos(esperado.eventos),
      somarVendidos(await db.collection('eventos').find({}, { projection: { lotes: 1 } }).toArray()),
    ],
    [
      'soma de cupons.usos',
      somarUsosDeCupom(esperado.cupons),
      somarUsosDeCupom(await db.collection('cupons').find({}, { projection: { usos: 1 } }).toArray()),
    ],
  );

  console.log(`Database "${nomeDoBanco}" comparado com ${arquivo}\n`);
  console.log(`${'item'.padEnd(26)}${'esperado'.padStart(10)}${'obtido'.padStart(10)}`);
  let divergencias = 0;
  for (const [item, valorEsperado, obtido] of linhas) {
    const igual = valorEsperado === obtido;
    if (!igual) divergencias++;
    console.log(
      `${item.padEnd(26)}${String(valorEsperado).padStart(10)}${String(obtido).padStart(10)}${igual ? '' : '  <-- DIVERGE'}`,
    );
  }
  console.log(divergencias === 0 ? '\nTudo confere.' : `\n${divergencias} divergência(s).`);
  if (divergencias > 0) process.exitCode = 1;
} finally {
  await cliente.close();
}
