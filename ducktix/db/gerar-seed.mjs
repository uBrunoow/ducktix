/**
 * Gera `db/seed.sql` a partir da MESMA fixture que a aplicação usa
 * (`src/server/event/infrastructure/seed-catalogo.ts`).
 *
 * Por que gerar em vez de escrever à mão: o seed do app e o seed do banco
 * precisam contar a mesma história. Digitar 30 eventos e ~9.000 inscrições
 * duas vezes garante divergência — aqui existe uma fonte só.
 *
 * As inscrições, ingressos e check-ins são derivados de `lote.vendidos` com o
 * mesmo gerador determinístico de `seed-inscricoes.ts`: mesma semente, mesma
 * saída, então o número que aparece no painel é o número que está no banco.
 *
 * Uso:  node db/gerar-seed.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..');

// -----------------------------------------------------------------------------
// 1. Lê a fixture do app
// -----------------------------------------------------------------------------

const fonte = readFileSync(
  join(raiz, 'src/server/event/infrastructure/seed-catalogo.ts'),
  'utf8',
);

const inicio = fonte.indexOf('const LINHAS');
const abre = fonte.indexOf('[', inicio);
const fecha = fonte.indexOf('\n];', abre);
if (inicio < 0 || abre < 0 || fecha < 0) {
  throw new Error('Não encontrei o array LINHAS em seed-catalogo.ts');
}
const literal = fonte.slice(abre, fecha + 2);

/** O literal é JS válido — avaliar é mais confiável que regex sobre texto com acento. */
const LINHAS = new Function(`return ${literal};`)();

// -----------------------------------------------------------------------------
// 2. Mesmo gerador determinístico de seed-inscricoes.ts
// -----------------------------------------------------------------------------

const NOMES = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Henrique',
  'Isabela', 'João', 'Karina', 'Lucas', 'Mariana', 'Nathan', 'Olívia', 'Pedro',
  'Queila', 'Rafael', 'Sofia', 'Thiago', 'Úrsula', 'Vinícius', 'William', 'Yara',
];
const SOBRENOMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Almeida',
  'Nascimento', 'Araújo', 'Ribeiro', 'Carvalho', 'Gomes', 'Martins', 'Rocha',
  'Barbosa', 'Correia', 'Teixeira', 'Fernandes', 'Moreira',
];

function criarSorteio(semente) {
  let estado = semente % 2_147_483_647;
  if (estado <= 0) estado += 2_147_483_646;
  return () => {
    estado = (estado * 16_807) % 2_147_483_647;
    return (estado - 1) / 2_147_483_646;
  };
}

function semeteDoTexto(texto) {
  let valor = 7;
  for (let i = 0; i < texto.length; i += 1) {
    valor = (valor * 31 + texto.charCodeAt(i)) % 2_147_483_647;
  }
  return valor;
}

const semAcento = (t) =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// -----------------------------------------------------------------------------
// 3. Helpers de SQL
// -----------------------------------------------------------------------------

const AGORA = new Date();
const txt = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const ts = (d) => `'${d.toISOString()}'`;
const slugify = (s) =>
  semAcento(s).trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const linhas = [];
const w = (s = '') => linhas.push(s);

// -----------------------------------------------------------------------------
// 4. Monta os conjuntos
// -----------------------------------------------------------------------------

const organizadores = [...new Set(LINHAS.map((l) => l[2]))].sort();
const categorias = [...new Set(LINHAS.map((l) => l[3]))].sort();

w('-- =============================================================================');
w('-- Ducktix — carga de dados de demonstração');
w('--');
w('-- ARQUIVO GERADO por db/gerar-seed.mjs a partir da fixture da aplicação.');
w('-- Não editar à mão: rode `node db/gerar-seed.mjs` novamente.');
w('--');
w('-- DADOS SINTÉTICOS: nenhuma pessoa, organizador ou local aqui existe.');
w('-- E-mails usam @example.com (RFC 2606, domínio reservado e não entregável).');
w('--');
w('-- Uso:  psql -d ducktix -f db/schema.sql && psql -d ducktix -f db/seed.sql');
w('-- =============================================================================');
w('');
w('BEGIN;');
w('');

// --- categorias --------------------------------------------------------------
w('-- Categorias -----------------------------------------------------------------');
w('INSERT INTO categoria (id, nome, slug) VALUES');
w(
  categorias
    .map((c) => `  (gen_random_uuid(), ${txt(c)}, ${txt(slugify(c))})`)
    .join(',\n') + ';',
);
w('');

// --- usuários organizadores --------------------------------------------------
w('-- Usuários organizadores ------------------------------------------------------');
w('-- Senha de demonstração para todos: "ducktix123" (hash fictício, não reversível).');
w("INSERT INTO usuario (id, nome, email, senha_hash, papel) VALUES");
w(
  organizadores
    .map(
      (o) =>
        `  (gen_random_uuid(), ${txt(o)}, ${txt(`${slugify(o)}@example.com`)}, ${txt('$demo$ducktix123')}, 'organizador')`,
    )
    .join(',\n') + ';',
);
w('');
w('INSERT INTO organizador (id, usuario_id, nome_fantasia, email_contato)');
w('SELECT gen_random_uuid(), u.id, u.nome, u.email');
w("FROM usuario u WHERE u.papel = 'organizador';");
w('');

// --- eventos -----------------------------------------------------------------
w('-- Eventos --------------------------------------------------------------------');
for (const linha of LINHAS) {
  const [slug, nome, organizador, categoria, modalidade, local, mes, dia, hora, , descricao, lotes] = linha;
  const comecaEm = new Date(2026, mes, dia, hora, 0);
  const terminaEm = new Date(comecaEm.getTime() + 3 * 60 * 60 * 1000);
  const formatoOnline = modalidade === 'presencial' ? null : 'ao-vivo';

  w(`INSERT INTO evento (organizador_id, slug, nome, descricao, local, modalidade, formato_online, status, visibilidade, comeca_em, termina_em)`);
  w(`SELECT o.id,`);
  w(`       ${txt(slug)}, ${txt(nome)}, ${txt(descricao)}, ${txt(local)},`);
  w(`       ${txt(modalidade)}, ${txt(formatoOnline)}, 'publicado', 'publico',`);
  w(`       ${ts(comecaEm)}, ${ts(terminaEm)}`);
  w(`FROM organizador o WHERE o.nome_fantasia = ${txt(organizador)};`);
  w('');

  w(`INSERT INTO evento_categoria (evento_id, categoria_id)`);
  w(`SELECT e.id, c.id FROM evento e, categoria c`);
  w(`WHERE e.slug = ${txt(slug)} AND c.nome = ${txt(categoria)};`);
  w('');

  // Mesma cascata de `montar()` em seed-catalogo.ts: lote i abre quando o
  // lote i-1 encerra, e os encerramentos ficam de sete em sete dias antes do
  // evento. Se divergir daqui, o painel e o banco contam histórias
  // diferentes — que é justamente o que este gerador existe para evitar.
  const encerramentoDe = (indice) =>
    indice < lotes.length - 1
      ? new Date(2026, mes, Math.max(dia - (lotes.length - 1 - indice) * 7, 1), 23, 59)
      : null;

  lotes.forEach(([nomeLote, preco, vagas, vendidos], indice) => {
    const iniciaEm = indice === 0 || vendidos > 0 ? null : encerramentoDe(indice - 1);
    const encerraEm = encerramentoDe(indice);
    w(`INSERT INTO lote (evento_id, nome, preco_centavos, vagas, vendidos, inicia_em, encerra_em, ordem)`);
    w(`SELECT e.id, ${txt(nomeLote)}, ${preco}, ${vagas}, ${vendidos}, ${iniciaEm ? ts(iniciaEm) : 'NULL'}, ${encerraEm ? ts(encerraEm) : 'NULL'}, ${indice}`);
    w(`FROM evento e WHERE e.slug = ${txt(slug)};`);
  });
  w('');
}

// --- cupons ------------------------------------------------------------------
w('-- Cupons ---------------------------------------------------------------------');
const CUPONS = [
  ['PROMO10', 'percentual', 10, new Date(2026, 0, 1), new Date(2026, 11, 31, 23, 59, 59), 100, true, []],
  ['PRIMEIROLOTE', 'fixo', 2000, new Date(2026, 5, 1), new Date(2026, 9, 31, 23, 59, 59), 50, true, ['semana-de-dados-2026', 'arquitetura-de-software']],
  ['INVERNO25', 'percentual', 25, new Date(2026, 5, 1), new Date(2026, 7, 31, 23, 59, 59), 200, true, ['festival-de-inverno-tardio']],
  ['ESTUDANTE', 'percentual', 50, new Date(2026, 2, 1), new Date(2026, 11, 31, 23, 59, 59), 30, false, []],
];
for (const [codigo, tipo, valor, de, ate, limite, ativo, eventos] of CUPONS) {
  w(`INSERT INTO cupom (codigo, tipo_desconto, valor, valido_de, valido_ate, limite_uso, ativo)`);
  w(`VALUES (${txt(codigo)}, ${txt(tipo)}, ${valor}, ${ts(de)}, ${ts(ate)}, ${limite}, ${ativo});`);
  for (const slug of eventos) {
    w(`INSERT INTO cupom_evento (cupom_id, evento_id)`);
    w(`SELECT c.id, e.id FROM cupom c, evento e WHERE c.codigo = ${txt(codigo)} AND e.slug = ${txt(slug)};`);
  }
}
w('');

// --- participantes, pedidos, inscrições, ingressos, check-ins ----------------
w('-- Participantes, pedidos, inscrições, ingressos e check-ins -------------------');
w('-- Derivados de lote.vendidos com o mesmo gerador determinístico do app.');
w('');
w('-- Comprador único de demonstração (os ingressos são nominais a terceiros).');
w("INSERT INTO usuario (id, nome, email, senha_hash, papel)");
w("VALUES (gen_random_uuid(), 'Comprador de Demonstração', 'comprador@example.com', '$demo$ducktix123', 'participante');");
w('');

let totalInscricoes = 0;

for (const linha of LINHAS) {
  const [slug, , , , , , mes, dia, hora, , , lotes] = linha;
  const comecaEm = new Date(2026, mes, dia, hora, 0);
  const jaAconteceu = AGORA >= comecaEm;

  const sortear = criarSorteio(semeteDoTexto(slug));
  const taxaDePresenca = 0.68 + sortear() * 0.24;

  let indiceGlobal = 0;
  let pedidoAtual = 0;
  let restantesNoPedido = 0;
  /** Agrupa por pedido para emitir um INSERT de pedido por grupo. */
  const porPedido = new Map();

  for (const [nomeLote, preco, , vendidos] of lotes) {
    for (let i = 0; i < vendidos; i += 1) {
      if (restantesNoPedido === 0) {
        pedidoAtual += 1;
        restantesNoPedido = 1 + Math.floor(sortear() * 4);
      }
      restantesNoPedido -= 1;

      const nome = NOMES[Math.floor(sortear() * NOMES.length)];
      const sobrenome = SOBRENOMES[Math.floor(sortear() * SOBRENOMES.length)];
      const r = sortear();
      const proporcao = 1 - r * r;
      const janelaMs = 45 * 24 * 60 * 60 * 1000;
      const compradoEm = new Date(
        comecaEm.getTime() - janelaMs + proporcao * (janelaMs - 24 * 60 * 60 * 1000),
      );
      const cancelada = sortear() < 0.03;
      const compareceu = sortear() < taxaDePresenca;

      const chave = `${slug}-ped-${pedidoAtual}`;
      if (!porPedido.has(chave)) porPedido.set(chave, { compradoEm, itens: [] });
      porPedido.get(chave).itens.push({
        nomeLote,
        preco,
        nome,
        sobrenome,
        email: `${semAcento(nome)}.${semAcento(sobrenome)}${indiceGlobal}@example.com`,
        codigo: `${slug}-${indiceGlobal}`,
        cancelada,
        compareceu: jaAconteceu && compareceu && !cancelada,
        compradoEm,
      });
      indiceGlobal += 1;
      totalInscricoes += 1;
    }
  }

  w(`-- ${slug}: ${indiceGlobal} inscrições em ${porPedido.size} pedidos`);
  w('DO $$');
  w('DECLARE');
  w('  v_evento    UUID;');
  w('  v_comprador UUID;');
  w('  v_pedido    UUID;');
  w('  v_lote      UUID;');
  w('  v_item      UUID;');
  w('  v_part      UUID;');
  w('  v_insc      UUID;');
  w('  v_ing       UUID;');
  w('BEGIN');
  w(`  SELECT id INTO v_evento FROM evento WHERE slug = ${txt(slug)};`);
  w("  SELECT id INTO v_comprador FROM usuario WHERE email = 'comprador@example.com';");
  w('');

  for (const [, dados] of porPedido) {
    w(`  INSERT INTO pedido (comprador_id, status, criado_em, confirmado_em,`);
    w(`                      cobranca_cpf, cobranca_cep, cobranca_logradouro, cobranca_numero,`);
    w(`                      cobranca_bairro, cobranca_cidade, cobranca_uf)`);
    w(`  VALUES (v_comprador, 'confirmado', ${ts(dados.compradoEm)}, ${ts(dados.compradoEm)},`);
    w(`          '12345678909', '88010000', 'Rua Bocaiuva', '12', 'Centro', 'Florianópolis', 'SC')`);
    w('  RETURNING id INTO v_pedido;');

    // Agrupa itens do pedido por lote (a tabela tem UNIQUE (pedido_id, lote_id)).
    const porLote = new Map();
    for (const item of dados.itens) {
      if (!porLote.has(item.nomeLote)) porLote.set(item.nomeLote, []);
      porLote.get(item.nomeLote).push(item);
    }

    for (const [nomeLote, itens] of porLote) {
      w(`  SELECT id INTO v_lote FROM lote WHERE evento_id = v_evento AND nome = ${txt(nomeLote)};`);
      w(`  INSERT INTO item_pedido (pedido_id, lote_id, quantidade, preco_unitario_centavos)`);
      w(`  VALUES (v_pedido, v_lote, ${itens.length}, ${itens[0].preco}) RETURNING id INTO v_item;`);

      for (const item of itens) {
        w(`  INSERT INTO participante (nome, sobrenome, email) VALUES (${txt(item.nome)}, ${txt(item.sobrenome)}, ${txt(item.email)}) RETURNING id INTO v_part;`);
        w(`  INSERT INTO inscricao (evento_id, participante_id, item_pedido_id, lote_id, preco_pago_centavos, status, inscrito_em)`);
        w(`  VALUES (v_evento, v_part, v_item, v_lote, ${item.preco}, ${item.cancelada ? "'cancelada'" : "'ativa'"}, ${ts(item.compradoEm)}) RETURNING id INTO v_insc;`);
        w(`  INSERT INTO ingresso (inscricao_id, codigo, status, emitido_em)`);
        w(`  VALUES (v_insc, ${txt(item.codigo)}, ${item.cancelada ? "'cancelado'" : item.compareceu ? "'utilizado'" : "'emitido'"}, ${ts(item.compradoEm)}) RETURNING id INTO v_ing;`);
        if (item.compareceu) {
          w(`  INSERT INTO check_in (ingresso_id, realizado_em) VALUES (v_ing, ${ts(comecaEm)});`);
        }
      }
    }

    w(`  INSERT INTO pagamento (pedido_id, metodo, status, valor_centavos, pago_em)`);
    const total = dados.itens.reduce((t, i) => t + i.preco, 0);
    w(`  VALUES (v_pedido, 'pix', 'aprovado', ${total}, ${ts(dados.compradoEm)});`);
    w('');
  }

  w('END $$;');
  w('');
}

w('COMMIT;');
w('');
w('-- Conferência rápida:');
w("--   SELECT 'eventos', count(*) FROM evento");
w("--   UNION ALL SELECT 'lotes', count(*) FROM lote");
w("--   UNION ALL SELECT 'inscrições', count(*) FROM inscricao");
w("--   UNION ALL SELECT 'ingressos', count(*) FROM ingresso");
w("--   UNION ALL SELECT 'check-ins', count(*) FROM check_in;");

mkdirSync(aqui, { recursive: true });
writeFileSync(join(aqui, 'seed.sql'), linhas.join('\n'), 'utf8');

console.log(
  `seed.sql gerado: ${LINHAS.length} eventos, ${categorias.length} categorias, ` +
    `${organizadores.length} organizadores, ${totalInscricoes} inscrições.`,
);
