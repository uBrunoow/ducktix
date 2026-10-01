/*
 * Ducktix — criação do banco MongoDB (Fase 2).
 *
 * Equivalente ao antigo `db/schema.sql`: cria as collections com validação
 * `$jsonSchema` (o papel dos CHECK / NOT NULL do PostgreSQL) e os índices
 * (o papel dos PRIMARY KEY / UNIQUE / INDEX). É idempotente: rodar de novo
 * atualiza validadores e índices sem apagar dados.
 *
 * Como executar (qualquer um dos dois):
 *
 *   mongosh "mongodb://localhost:27017/ducktix" database/criar-banco.js
 *   pnpm db:setup        # mesmo arquivo, executado pelo driver Node
 *
 * O script só usa getCollectionNames, createCollection, runCommand e
 * getCollection(...).createIndex — o subconjunto que o runner Node
 * (`database/scripts/criar-banco.mjs`) também oferece.
 *
 * Modelo (ver docs/migracao-postgresql-mongodb.md):
 *   usuarios                 usuario + organizador (embutido, 1:1)
 *   tokensRedefinicaoSenha   token_redefinicao_senha (TTL)
 *   categorias               categoria
 *   eventos                  evento + lote[] + evento_categoria[] (embutidos)
 *   cupons                   cupom + cupom_evento[] + uso_de_cupom[] (embutidos)
 *   pedidos                  pedido + item_pedido[] + pagamento[] (embutidos)
 *   inscricoes               inscricao + participante + ingresso + check_in
 *                            + cancelamento_de_inscricao[] (embutidos)
 */

const texto = { bsonType: 'string' };
const textoOuNulo = { bsonType: ['string', 'null'] };
const data = { bsonType: 'date' };
const dataOuNula = { bsonType: ['date', 'null'] };
const inteiro = { bsonType: ['int', 'long'] };
const inteiroNaoNegativo = { bsonType: ['int', 'long'], minimum: 0 };
const inteiroPositivo = { bsonType: ['int', 'long'], minimum: 1 };
const booleano = { bsonType: 'bool' };
const enumDe = (...valores) => ({ bsonType: 'string', enum: valores });

const colecoes = {
  // ---------------------------------------------------------------------------
  // Identidade
  // ---------------------------------------------------------------------------
  usuarios: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['_id', 'nome', 'email', 'senhaHash', 'papel', 'criadoEm'],
      properties: {
        _id: texto,
        nome: { bsonType: 'string', maxLength: 120 },
        email: { bsonType: 'string', maxLength: 160 },
        senhaHash: { bsonType: 'string', maxLength: 255 },
        papel: enumDe('participante', 'organizador'),
        cpfCnpj: { bsonType: ['string', 'null'], pattern: '^([0-9]{11}|[0-9]{14})$' },
        fotoUrl: textoOuNulo,
        criadoEm: data,
        // Antiga tabela `organizador` (1:1 com usuário). Nasce no primeiro
        // evento criado pela conta.
        organizador: {
          bsonType: ['object', 'null'],
          required: ['id', 'nomeFantasia'],
          properties: {
            id: texto,
            nomeFantasia: { bsonType: 'string', maxLength: 140 },
            documento: textoOuNulo,
            emailContato: textoOuNulo,
          },
        },
      },
    },
  },

  tokensRedefinicaoSenha: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['_id', 'usuarioId', 'expiraEm'],
      properties: { _id: texto, usuarioId: texto, expiraEm: data },
    },
  },

  // ---------------------------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------------------------
  categorias: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['_id', 'nome', 'slug'],
      properties: {
        _id: texto,
        nome: { bsonType: 'string', maxLength: 60 },
        slug: { bsonType: 'string', maxLength: 60 },
      },
    },
  },

  eventos: {
    $and: [
      {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            '_id', 'slug', 'nome', 'descricao', 'modalidade', 'status', 'visibilidade',
            'comecaEm', 'terminaEm', 'isHighlighted', 'criadoEm', 'organizador',
            'categorias', 'lotes',
          ],
          properties: {
            _id: texto,
            slug: { bsonType: 'string', maxLength: 160 },
            nome: { bsonType: 'string', maxLength: 140 },
            descricao: texto,
            local: textoOuNulo,
            modalidade: enumDe('presencial', 'online', 'hibrido'),
            formatoOnline: {
              bsonType: ['string', 'null'],
              enum: ['ao-vivo', 'videoconferencia', 'desafio-virtual', 'conteudo-digital', null],
            },
            status: enumDe('rascunho', 'publicado', 'encerrado', 'cancelado'),
            visibilidade: enumDe('publico', 'nao-listado'),
            comecaEm: data,
            terminaEm: data,
            imagemUrl: textoOuNulo,
            isHighlighted: booleano,
            criadoEm: data,
            // Referência estendida: id + nome copiados do organizador, para a
            // vitrine não precisar de "JOIN" com usuarios.
            organizador: {
              bsonType: 'object',
              required: ['id', 'usuarioId', 'nome'],
              properties: { id: texto, usuarioId: textoOuNulo, nome: texto },
            },
            categorias: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                required: ['id', 'nome'],
                properties: { id: texto, nome: texto },
              },
            },
            lotes: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                required: ['_id', 'nome', 'precoCentavos', 'vagas', 'vendidos', 'ordem'],
                properties: {
                  _id: texto,
                  nome: { bsonType: 'string', maxLength: 60 },
                  precoCentavos: inteiroNaoNegativo,
                  vagas: inteiroPositivo,
                  vendidos: inteiroNaoNegativo,
                  iniciaEm: dataOuNula,
                  encerraEm: dataOuNula,
                  ordem: inteiro,
                },
              },
            },
          },
        },
      },
      // ck_evento_periodo
      { $expr: { $gt: ['$terminaEm', '$comecaEm'] } },
      // ck_evento_local_por_modalidade / ck_evento_formato_por_modalidade
      {
        $or: [
          { modalidade: 'online', local: null, formatoOnline: { $ne: null } },
          { modalidade: 'presencial', local: { $ne: null }, formatoOnline: null },
          { modalidade: 'hibrido', local: { $ne: null }, formatoOnline: { $ne: null } },
        ],
      },
      // ck_lote_estoque + ck_lote_janela + uk_lote_nome
      {
        $expr: {
          $and: [
            {
              $allElementsTrue: [
                {
                  $map: {
                    input: '$lotes',
                    as: 'l',
                    in: {
                      $and: [
                        { $lte: ['$$l.vendidos', '$$l.vagas'] },
                        {
                          $or: [
                            { $eq: [{ $ifNull: ['$$l.iniciaEm', null] }, null] },
                            { $eq: [{ $ifNull: ['$$l.encerraEm', null] }, null] },
                            { $gt: ['$$l.encerraEm', '$$l.iniciaEm'] },
                          ],
                        },
                      ],
                    },
                  },
                },
              ],
            },
            { $eq: [{ $size: { $setUnion: ['$lotes.nome', []] } }, { $size: '$lotes' }] },
          ],
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Vendas
  // ---------------------------------------------------------------------------
  cupons: {
    $and: [
      {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            '_id', 'codigo', 'tipoDesconto', 'valor', 'validoDe', 'validoAte',
            'limiteUso', 'usos', 'ativo', 'criadoEm', 'eventosIds', 'historicoDeUsos',
          ],
          properties: {
            _id: texto,
            codigo: { bsonType: 'string', maxLength: 24 },
            tipoDesconto: enumDe('percentual', 'fixo'),
            valor: inteiroPositivo,
            validoDe: data,
            validoAte: data,
            limiteUso: inteiroPositivo,
            usos: inteiroNaoNegativo,
            ativo: booleano,
            criadoEm: data,
            // Antiga cupom_evento (N:N): o cupom só vale nestes eventos.
            eventosIds: { bsonType: 'array', items: texto },
            // Antiga uso_de_cupom: limitada por `limiteUso`, então cabe no documento.
            historicoDeUsos: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                required: ['_id', 'pedidoId', 'eventoId', 'descontoCentavos', 'usadoEm'],
                properties: {
                  _id: texto,
                  pedidoId: texto,
                  eventoId: texto,
                  descontoCentavos: inteiroNaoNegativo,
                  usadoEm: data,
                },
              },
            },
          },
        },
      },
      // ck_cupom_janela, ck_cupom_usos, ck_cupom_percentual
      {
        $expr: {
          $and: [
            { $gt: ['$validoAte', '$validoDe'] },
            { $lte: ['$usos', '$limiteUso'] },
            { $or: [{ $ne: ['$tipoDesconto', 'percentual'] }, { $lte: ['$valor', 100] }] },
          ],
        },
      },
    ],
  },

  pedidos: {
    $and: [
      {
        $jsonSchema: {
          bsonType: 'object',
          required: ['_id', 'compradorId', 'status', 'criadoEm', 'itens', 'pagamentos'],
          properties: {
            _id: texto,
            compradorId: texto,
            status: enumDe('aberto', 'confirmado', 'cancelado'),
            criadoEm: data,
            reservadoAte: dataOuNula,
            confirmadoEm: dataOuNula,
            cupomId: textoOuNulo,
            // Mesmo papel da coluna jsonb `participantes_rascunho`.
            participantesRascunho: { bsonType: ['array', 'null'] },
            // As oito colunas cobranca_* viram um subdocumento: ou existe
            // inteiro, ou é nulo (ck_pedido_cobranca).
            cobranca: {
              bsonType: ['object', 'null'],
              required: ['cpf', 'endereco'],
              properties: {
                cpf: { bsonType: 'string', pattern: '^[0-9]{11}$' },
                endereco: {
                  bsonType: 'object',
                  required: ['cep', 'logradouro', 'cidade', 'uf'],
                  properties: {
                    cep: { bsonType: 'string', maxLength: 8 },
                    logradouro: texto,
                    numero: texto,
                    complemento: texto,
                    bairro: texto,
                    cidade: texto,
                    uf: { bsonType: 'string', minLength: 2, maxLength: 2 },
                  },
                },
              },
            },
            itens: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                required: ['_id', 'loteId', 'eventoId', 'quantidade', 'precoUnitarioCentavos'],
                properties: {
                  _id: texto,
                  loteId: texto,
                  eventoId: texto,
                  quantidade: inteiroPositivo,
                  precoUnitarioCentavos: inteiroNaoNegativo,
                },
              },
            },
            pagamentos: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                required: ['_id', 'metodo', 'status', 'valorCentavos', 'criadoEm'],
                properties: {
                  _id: texto,
                  metodo: enumDe('cartao', 'pix', 'boleto'),
                  status: enumDe('pendente', 'aprovado', 'recusado', 'estornado'),
                  valorCentavos: inteiroNaoNegativo,
                  codigoExterno: textoOuNulo,
                  criadoEm: data,
                  pagoEm: dataOuNula,
                },
              },
            },
          },
        },
      },
      // uk_item_pedido_lote: um item por lote dentro do pedido.
      { $expr: { $eq: [{ $size: { $setUnion: ['$itens.loteId', []] } }, { $size: '$itens' }] } },
    ],
  },

  // ---------------------------------------------------------------------------
  // Participação
  // ---------------------------------------------------------------------------
  inscricoes: {
    $jsonSchema: {
      bsonType: 'object',
      required: [
        '_id', 'eventoId', 'pedidoId', 'itemPedidoId', 'compradorId', 'lote',
        'precoPagoCentavos', 'status', 'inscritoEm', 'pedidoCriadoEm',
        'participante', 'ingresso', 'cancelamentos',
      ],
      properties: {
        _id: texto,
        eventoId: texto,
        pedidoId: texto,
        itemPedidoId: texto,
        compradorId: texto,
        // Nome do lote copiado: lote com venda não pode ser editado, então o
        // valor não diverge do original.
        lote: {
          bsonType: 'object',
          required: ['id', 'nome'],
          properties: { id: texto, nome: texto },
        },
        precoPagoCentavos: inteiroNaoNegativo,
        status: enumDe('ativa', 'cancelada'),
        comoConheceu: textoOuNulo,
        inscritoEm: data,
        pedidoCriadoEm: data,
        pedidoConfirmadoEm: dataOuNula,
        // Antiga tabela `participante` (uma linha por inscrição).
        participante: {
          bsonType: 'object',
          required: ['nome', 'sobrenome', 'email'],
          properties: {
            nome: { bsonType: 'string', maxLength: 80 },
            sobrenome: { bsonType: 'string', maxLength: 80 },
            email: { bsonType: 'string', maxLength: 160 },
            cpf: textoOuNulo,
            celular: textoOuNulo,
            nomeCracha: textoOuNulo,
            linkedin: textoOuNulo,
            github: textoOuNulo,
            empresa: textoOuNulo,
            segmento: textoOuNulo,
            cargo: textoOuNulo,
            nivel: textoOuNulo,
          },
        },
        // Antiga tabela `ingresso` (1:1).
        ingresso: {
          bsonType: 'object',
          required: ['id', 'codigo', 'status', 'emitidoEm'],
          properties: {
            id: texto,
            codigo: { bsonType: 'string', maxLength: 64 },
            status: enumDe('emitido', 'utilizado', 'cancelado'),
            emitidoEm: data,
          },
        },
        // Antiga tabela `check_in` (0..1).
        checkIn: {
          bsonType: ['object', 'null'],
          required: ['realizadoEm'],
          properties: { realizadoEm: data, operadorId: textoOuNulo },
        },
        // Antiga tabela `cancelamento_de_inscricao` (0..N).
        cancelamentos: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['_id', 'status', 'solicitadoEm'],
            properties: {
              _id: texto,
              motivo: { bsonType: ['string', 'null'], maxLength: 200 },
              status: enumDe('solicitado', 'aprovado', 'negado'),
              solicitadoEm: data,
              resolvidoEm: dataOuNula,
            },
          },
        },
      },
    },
  },
};

const indices = {
  usuarios: [[{ email: 1 }, { unique: true, name: 'uk_usuarios_email' }]],
  tokensRedefinicaoSenha: [
    // TTL: o MongoDB apaga sozinho os tokens vencidos.
    [{ expiraEm: 1 }, { expireAfterSeconds: 0, name: 'ttl_tokens_expira_em' }],
    [{ usuarioId: 1 }, { name: 'idx_tokens_usuario' }],
  ],
  categorias: [
    [{ nome: 1 }, { unique: true, name: 'uk_categorias_nome' }],
    [{ slug: 1 }, { unique: true, name: 'uk_categorias_slug' }],
  ],
  eventos: [
    [{ slug: 1 }, { unique: true, name: 'uk_eventos_slug' }],
    [{ status: 1, comecaEm: 1 }, { name: 'idx_eventos_status_comeca' }],
    [{ isHighlighted: 1, status: 1, visibilidade: 1, comecaEm: 1 }, { name: 'idx_eventos_destaque' }],
    [{ 'organizador.usuarioId': 1, comecaEm: 1 }, { name: 'idx_eventos_organizador' }],
    [{ 'categorias.nome': 1 }, { name: 'idx_eventos_categoria' }],
  ],
  cupons: [
    [{ codigo: 1, eventosIds: 1 }, { name: 'idx_cupons_codigo_evento' }],
    [{ 'historicoDeUsos.eventoId': 1 }, { name: 'idx_cupons_usos_evento' }],
    [{ criadoEm: -1 }, { name: 'idx_cupons_criado' }],
  ],
  pedidos: [
    [{ compradorId: 1, status: 1, criadoEm: -1 }, { name: 'idx_pedidos_comprador' }],
    [{ 'itens._id': 1 }, { name: 'idx_pedidos_item' }],
    [{ 'itens.loteId': 1 }, { name: 'idx_pedidos_lote' }],
    [{ 'itens.eventoId': 1 }, { name: 'idx_pedidos_evento' }],
  ],
  inscricoes: [
    [{ 'ingresso.codigo': 1 }, { unique: true, name: 'uk_inscricoes_codigo' }],
    [{ 'ingresso.id': 1 }, { unique: true, name: 'uk_inscricoes_ingresso' }],
    [{ eventoId: 1, pedidoCriadoEm: -1 }, { name: 'idx_inscricoes_evento' }],
    [{ eventoId: 1, 'participante.cpf': 1, status: 1 }, { name: 'idx_inscricoes_evento_cpf' }],
    [{ eventoId: 1, 'checkIn.realizadoEm': -1 }, { name: 'idx_inscricoes_checkin' }],
    [{ itemPedidoId: 1 }, { name: 'idx_inscricoes_item_pedido' }],
    [{ pedidoId: 1 }, { name: 'idx_inscricoes_pedido' }],
    [{ 'cancelamentos.status': 1, eventoId: 1 }, { name: 'idx_inscricoes_cancelamentos' }],
  ],
};

// Estilo síncrono, que é o nativo do `mongosh` (ele não aguarda promessas de
// scripts). O runner Node acrescenta `await` antes de cada chamada a `db.`.
const existentes = db.getCollectionNames();

for (const [nome, validator] of Object.entries(colecoes)) {
  const opcoes = { validator, validationLevel: 'strict', validationAction: 'error' };
  if (existentes.includes(nome)) {
    db.runCommand({ collMod: nome, ...opcoes });
    print(`collection ${nome}: validador atualizado`);
  } else {
    db.createCollection(nome, opcoes);
    print(`collection ${nome}: criada`);
  }

  for (const [chaves, opcoesDoIndice] of indices[nome] ?? []) {
    db.getCollection(nome).createIndex(chaves, opcoesDoIndice);
  }
  print(`  ${(indices[nome] ?? []).length} índice(s) garantido(s)`);
}

print('Banco pronto.');
