/**
 * Popula o MongoDB com os dados da Fase 1.
 *
 * A fonte é o backup do PostgreSQL entregue na Fase 1
 * (`database/legacy-postgres/backup.sql`), lido como TEXTO: os blocos
 * `COPY ... FROM stdin` são linhas separadas por tab, fáceis de interpretar.
 * Nenhum PostgreSQL é necessário para rodar este script.
 *
 * Os registros das 18 tabelas são transformados nos documentos das 7
 * collections (ver docs/migracao-postgresql-mongodb.md, seção 6). Os UUIDs
 * originais viram os `_id` — links, QR codes e sessões continuam válidos.
 *
 * Antes de inserir, roda `criar-banco.js`: os validadores `$jsonSchema`
 * conferem cada documento convertido.
 *
 * Uso:  pnpm db:seed            (falha se o banco já tiver dados)
 *       pnpm db:seed --reset    (apaga os documentos e popula de novo)
 *       pnpm db:seed --arquivo <dump.sql>
 *                               (usa outro `pg_dump` em texto puro no lugar do
 *                               backup; dump real fica fora do repositório)
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import { carregarAmbiente } from './ambiente.mjs';
import { criarBanco } from './criar-banco.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const CAMINHO_DO_BACKUP = join(aqui, '..', 'legacy-postgres', 'backup.sql');

/** Lê `--arquivo <caminho>` da linha de comando; sem ele, usa o backup da Fase 1. */
export function arquivoDosArgumentos(argumentos) {
  const posicao = argumentos.indexOf('--arquivo');
  if (posicao === -1) return CAMINHO_DO_BACKUP;
  const caminho = argumentos[posicao + 1];
  if (!caminho || caminho.startsWith('--')) throw new Error('--arquivo exige um caminho.');
  return caminho;
}

// -----------------------------------------------------------------------------
// 1. Leitura dos blocos COPY
// -----------------------------------------------------------------------------

function desescapar(campo) {
  if (campo === '\\N') return null;
  return campo.replace(/\\(.)/g, (_, c) =>
    ({ t: '\t', n: '\n', r: '\r', b: '\b', f: '\f', v: '\v' })[c] ?? c,
  );
}

/** Lê todos os blocos `COPY public.<tabela> (...) FROM stdin;` do dump. */
function lerTabelas(sql) {
  const tabelas = {};
  const linhas = sql.split('\n');
  for (let i = 0; i < linhas.length; i++) {
    const cabecalho = /^COPY public\.(\w+) \(([^)]*)\) FROM stdin;$/.exec(linhas[i]);
    if (!cabecalho) continue;
    const [, tabela, listaDeColunas] = cabecalho;
    const colunas = listaDeColunas.split(', ');
    const registros = [];
    for (i++; linhas[i] !== '\\.'; i++) {
      const valores = linhas[i].split('\t').map(desescapar);
      registros.push(Object.fromEntries(colunas.map((c, j) => [c, valores[j]])));
    }
    tabelas[tabela] = registros;
  }
  return tabelas;
}

/** `2026-09-05 12:00:00.123+00` → Date. */
function data(valor) {
  if (valor === null) return null;
  const iso = valor.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00');
  const resultado = new Date(iso);
  if (Number.isNaN(resultado.getTime())) throw new Error(`Data inválida no backup: ${valor}`);
  return resultado;
}

const inteiro = (valor) => (valor === null ? null : Number.parseInt(valor, 10));
const booleano = (valor) => valor === 't';

function agruparPor(registros, chave) {
  const mapa = new Map();
  for (const registro of registros) {
    const lista = mapa.get(registro[chave]) ?? [];
    lista.push(registro);
    mapa.set(registro[chave], lista);
  }
  return mapa;
}

const indexarPor = (registros, chave) => new Map(registros.map((r) => [r[chave], r]));

// -----------------------------------------------------------------------------
// 2. Tabelas → documentos
// -----------------------------------------------------------------------------

export function converterBackup(sql) {
  const t = lerTabelas(sql);
  const vazio = (nome) => t[nome] ?? [];

  // --- usuarios (+ organizador embutido) ---------------------------------------
  const organizadorPorUsuario = indexarPor(
    vazio('organizador').filter((o) => o.usuario_id !== null),
    'usuario_id',
  );
  const usuarios = vazio('usuario').map((u) => {
    const organizador = organizadorPorUsuario.get(u.id);
    return {
      _id: u.id,
      nome: u.nome,
      email: u.email,
      senhaHash: u.senha_hash,
      papel: u.papel,
      cpfCnpj: u.cpf_cnpj,
      fotoUrl: u.foto_url,
      criadoEm: data(u.criado_em),
      organizador: organizador
        ? {
            id: organizador.id,
            nomeFantasia: organizador.nome_fantasia,
            documento: organizador.documento,
            emailContato: organizador.email_contato,
          }
        : null,
    };
  });

  const tokensRedefinicaoSenha = vazio('token_redefinicao_senha').map((tk) => ({
    _id: tk.token,
    usuarioId: tk.usuario_id,
    expiraEm: data(tk.expira_em),
  }));

  // --- categorias ---------------------------------------------------------------
  const categorias = vazio('categoria').map((c) => ({ _id: c.id, nome: c.nome, slug: c.slug }));
  const categoriaPorId = indexarPor(vazio('categoria'), 'id');

  // --- eventos (+ lotes, categorias e organizador embutidos) --------------------
  const organizadorPorId = indexarPor(vazio('organizador'), 'id');
  const lotesPorEvento = agruparPor(vazio('lote'), 'evento_id');
  const categoriasPorEvento = agruparPor(vazio('evento_categoria'), 'evento_id');
  const lotePorId = indexarPor(vazio('lote'), 'id');

  const eventos = vazio('evento').map((e) => {
    const organizador = organizadorPorId.get(e.organizador_id);
    return {
      _id: e.id,
      slug: e.slug,
      nome: e.nome,
      descricao: e.descricao,
      local: e.local,
      modalidade: e.modalidade,
      formatoOnline: e.formato_online,
      status: e.status,
      visibilidade: e.visibilidade,
      comecaEm: data(e.comeca_em),
      terminaEm: data(e.termina_em),
      imagemUrl: e.imagem_url,
      isHighlighted: booleano(e.is_highlighted),
      criadoEm: data(e.criado_em),
      organizador: {
        id: organizador.id,
        usuarioId: organizador.usuario_id,
        nome: organizador.nome_fantasia,
      },
      categorias: (categoriasPorEvento.get(e.id) ?? [])
        .map((ec) => categoriaPorId.get(ec.categoria_id))
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map((c) => ({ id: c.id, nome: c.nome })),
      lotes: (lotesPorEvento.get(e.id) ?? [])
        .map((l) => ({
          _id: l.id,
          nome: l.nome,
          precoCentavos: inteiro(l.preco_centavos),
          vagas: inteiro(l.vagas),
          vendidos: inteiro(l.vendidos),
          iniciaEm: data(l.inicia_em),
          encerraEm: data(l.encerra_em),
          ordem: inteiro(l.ordem),
        }))
        .sort((a, b) => a.ordem - b.ordem),
    };
  });

  // --- cupons (+ eventos vinculados e usos embutidos) ---------------------------
  const eventosPorCupom = agruparPor(vazio('cupom_evento'), 'cupom_id');
  const usosPorCupom = agruparPor(vazio('uso_de_cupom'), 'cupom_id');
  const cupons = vazio('cupom').map((c) => ({
    _id: c.id,
    codigo: c.codigo,
    tipoDesconto: c.tipo_desconto,
    valor: inteiro(c.valor),
    validoDe: data(c.valido_de),
    validoAte: data(c.valido_ate),
    limiteUso: inteiro(c.limite_uso),
    usos: inteiro(c.usos),
    ativo: booleano(c.ativo),
    criadoEm: data(c.criado_em),
    eventosIds: (eventosPorCupom.get(c.id) ?? []).map((ce) => ce.evento_id),
    historicoDeUsos: (usosPorCupom.get(c.id) ?? []).map((u) => ({
      _id: u.id,
      pedidoId: u.pedido_id,
      eventoId: u.evento_id,
      descontoCentavos: inteiro(u.desconto_centavos),
      usadoEm: data(u.usado_em),
    })),
  }));

  // --- pedidos (+ itens e pagamentos embutidos) ---------------------------------
  const itensPorPedido = agruparPor(vazio('item_pedido'), 'pedido_id');
  const pagamentosPorPedido = agruparPor(vazio('pagamento'), 'pedido_id');
  const pedidos = vazio('pedido').map((p) => ({
    _id: p.id,
    compradorId: p.comprador_id,
    status: p.status,
    criadoEm: data(p.criado_em),
    reservadoAte: data(p.reservado_ate),
    confirmadoEm: data(p.confirmado_em),
    cupomId: p.cupom_id,
    participantesRascunho: p.participantes_rascunho ? JSON.parse(p.participantes_rascunho) : null,
    cobranca:
      p.cobranca_cpf && p.cobranca_cep && p.cobranca_logradouro && p.cobranca_cidade && p.cobranca_uf
        ? {
            cpf: p.cobranca_cpf,
            endereco: {
              cep: p.cobranca_cep,
              logradouro: p.cobranca_logradouro,
              numero: p.cobranca_numero ?? '',
              complemento: p.cobranca_complemento ?? '',
              bairro: p.cobranca_bairro ?? '',
              cidade: p.cobranca_cidade,
              uf: p.cobranca_uf,
            },
          }
        : null,
    itens: (itensPorPedido.get(p.id) ?? []).map((i) => ({
      _id: i.id,
      loteId: i.lote_id,
      // Copiado do lote: item_pedido só tinha lote_id, e o evento saía de um JOIN.
      eventoId: lotePorId.get(i.lote_id).evento_id,
      quantidade: inteiro(i.quantidade),
      precoUnitarioCentavos: inteiro(i.preco_unitario_centavos),
    })),
    pagamentos: (pagamentosPorPedido.get(p.id) ?? [])
      .map((pg) => ({
        _id: pg.id,
        metodo: pg.metodo,
        status: pg.status,
        valorCentavos: inteiro(pg.valor_centavos),
        codigoExterno: pg.codigo_externo,
        criadoEm: data(pg.criado_em),
        pagoEm: data(pg.pago_em),
      }))
      .sort((a, b) => a.criadoEm - b.criadoEm),
  }));

  // --- inscricoes (+ participante, ingresso, check-in e cancelamentos) ----------
  const participantePorId = indexarPor(vazio('participante'), 'id');
  const ingressoPorInscricao = indexarPor(vazio('ingresso'), 'inscricao_id');
  const checkInPorIngresso = indexarPor(vazio('check_in'), 'ingresso_id');
  const cancelamentosPorInscricao = agruparPor(vazio('cancelamento_de_inscricao'), 'inscricao_id');
  const itemPorId = indexarPor(vazio('item_pedido'), 'id');
  const pedidoPorId = indexarPor(vazio('pedido'), 'id');

  const inscricoes = vazio('inscricao').map((i) => {
    const participante = participantePorId.get(i.participante_id);
    const ingresso = ingressoPorInscricao.get(i.id);
    const checkIn = ingresso ? checkInPorIngresso.get(ingresso.id) : undefined;
    const item = itemPorId.get(i.item_pedido_id);
    const pedido = pedidoPorId.get(item.pedido_id);
    return {
      _id: i.id,
      eventoId: i.evento_id,
      pedidoId: pedido.id,
      itemPedidoId: item.id,
      compradorId: pedido.comprador_id,
      lote: { id: i.lote_id, nome: lotePorId.get(i.lote_id).nome },
      precoPagoCentavos: inteiro(i.preco_pago_centavos),
      status: i.status,
      comoConheceu: i.como_conheceu,
      inscritoEm: data(i.inscrito_em),
      pedidoCriadoEm: data(pedido.criado_em),
      pedidoConfirmadoEm: data(pedido.confirmado_em),
      participante: {
        nome: participante.nome,
        sobrenome: participante.sobrenome,
        email: participante.email,
        cpf: participante.cpf,
        celular: participante.celular,
        nomeCracha: participante.nome_cracha,
        linkedin: participante.linkedin,
        github: participante.github,
        empresa: participante.empresa,
        segmento: participante.segmento,
        cargo: participante.cargo,
        nivel: participante.nivel,
      },
      ingresso: {
        id: ingresso.id,
        codigo: ingresso.codigo,
        status: ingresso.status,
        emitidoEm: data(ingresso.emitido_em),
      },
      checkIn: checkIn
        ? { realizadoEm: data(checkIn.realizado_em), operadorId: checkIn.operador_id }
        : null,
      cancelamentos: (cancelamentosPorInscricao.get(i.id) ?? []).map((c) => ({
        _id: c.id,
        motivo: c.motivo,
        status: c.status,
        solicitadoEm: data(c.solicitado_em),
        resolvidoEm: data(c.resolvido_em),
      })),
    };
  });

  return { usuarios, tokensRedefinicaoSenha, categorias, eventos, cupons, pedidos, inscricoes };
}

// -----------------------------------------------------------------------------
// 3. Inserção
// -----------------------------------------------------------------------------

export async function popular(
  db,
  { reset = false, log = console.log, arquivo = CAMINHO_DO_BACKUP } = {},
) {
  await criarBanco(db, () => {});
  const colecoes = converterBackup(readFileSync(arquivo, 'utf8'));

  for (const nome of Object.keys(colecoes)) {
    const existentes = await db.collection(nome).estimatedDocumentCount();
    if (existentes > 0 && !reset) {
      throw new Error(
        `A collection "${nome}" já tem ${existentes} documento(s). Use --reset para apagar e popular de novo.`,
      );
    }
  }

  for (const [nome, documentos] of Object.entries(colecoes)) {
    const colecao = db.collection(nome);
    if (reset) await colecao.deleteMany({});
    for (let i = 0; i < documentos.length; i += 1000) {
      await colecao.insertMany(documentos.slice(i, i + 1000), { ordered: true });
    }
    log(`${nome.padEnd(24)} ${documentos.length} documento(s)`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { uri, nomeDoBanco } = carregarAmbiente();
  const cliente = new MongoClient(uri);
  try {
    await cliente.connect();
    const arquivo = arquivoDosArgumentos(process.argv.slice(2));
    console.log(`Populando "${nomeDoBanco}" a partir de ${arquivo}…`);
    await popular(cliente.db(nomeDoBanco), { reset: process.argv.includes('--reset'), arquivo });
    console.log('Seed concluído.');
  } catch (erro) {
    // Falha de validação do $jsonSchema traz o documento e a regra violada.
    console.error(erro.errInfo ? JSON.stringify(erro.errInfo, null, 2) : erro);
    process.exitCode = 1;
  } finally {
    await cliente.close();
  }
}
