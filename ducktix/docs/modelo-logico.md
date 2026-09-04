---
title: Modelo Lógico — Dicionário de Dados
tags:
  - ducktix
  - banco-de-dados
  - modelagem
aliases:
  - Esquema Lógico
  - Dicionário de Dados
updated: 2026-09-03
---

# Modelo Lógico — Ducktix

> [!abstract] Propósito
> Esquema lógico relacional em forma de **dicionário de dados** — item **(c)**
> do documento de entrega da Fase 1. O nível conceitual está em
> [[modelo-conceitual]]; o DDL executável está em `ducktix/db/schema.sql`.

**SGBD alvo:** PostgreSQL 16.
**Convenções:** nomes de tabela no singular e em `snake_case`; PK `id` do tipo
`UUID` com `gen_random_uuid()`; valores monetários em **centavos** (`INTEGER`),
nunca `FLOAT`; timestamps em `TIMESTAMPTZ`; toda FK indexada.

## Legenda

`PK` chave primária · `FK` chave estrangeira · `UK` chave única ·
`NN` não nulo · `CK` restrição de verificação · `DF` valor padrão

---

## 1. Contexto: Identidade

### 1.1 `usuario`
Conta de acesso ao sistema.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK, DF `gen_random_uuid()` | Identificador |
| nome | VARCHAR(120) | NN | Nome de exibição |
| email | VARCHAR(160) | NN, UK | Login; também usado para contato |
| senha_hash | VARCHAR(255) | NN | Hash da senha (nunca a senha) |
| papel | VARCHAR(20) | NN, CK ∈ {participante, organizador} | Define a área de acesso |
| cpf_cnpj | VARCHAR(14) | NULL | Só dígitos; 11 = CPF, 14 = CNPJ |
| foto_url | TEXT | NULL | Foto de perfil |
| criado_em | TIMESTAMPTZ | NN, DF `now()` | Data de cadastro |

### 1.2 `organizador`
Especialização de `usuario` que publica eventos.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador |
| usuario_id | UUID | FK → usuario(id), NN, UK | Um usuário é no máximo um organizador |
| nome_fantasia | VARCHAR(140) | NN | Nome exibido na vitrine |
| documento | VARCHAR(14) | NULL | CNPJ ou CPF do responsável |
| email_contato | VARCHAR(160) | NULL | Canal público de contato |

### 1.3 `participante`
Pessoa que ocupa a vaga. **Não exige conta** — o comprador pode nomear terceiros.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador |
| usuario_id | UUID | FK → usuario(id), NULL | Preenchido quando o participante tem conta |
| nome | VARCHAR(80) | NN | Nome |
| sobrenome | VARCHAR(80) | NN | Sobrenome |
| email | VARCHAR(160) | NN | Contato do participante |
| celular | VARCHAR(20) | NULL | Telefone |
| nome_cracha | VARCHAR(80) | NULL | Nome no crachá; vazio cai para nome + sobrenome |
| linkedin | VARCHAR(200) | NULL | Perfil profissional |
| github | VARCHAR(200) | NULL | Perfil profissional |
| empresa | VARCHAR(140) | NULL | Onde trabalha |
| segmento | VARCHAR(80) | NULL | Segmento da empresa |
| cargo | VARCHAR(80) | NULL | Cargo |
| nivel | VARCHAR(40) | NULL | Nível de experiência |

> As seis últimas colunas são o enriquecimento profissional opcional coletado no
> checkout. Ficam no próprio participante, não em tabela à parte: a relação é
> 1:1 e o dado nunca é lido sem o participante — uma tabela separada só
> acrescentaria um JOIN.

### 1.4 `token_redefinicao_senha`

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| token | VARCHAR(120) | PK | Token enviado ao usuário |
| usuario_id | UUID | FK → usuario(id), NN | Dono do token |
| expira_em | TIMESTAMPTZ | NN | Validade |

---

## 2. Contexto: Eventos

### 2.1 `categoria`

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador |
| nome | VARCHAR(60) | NN, UK | Nome exibido |
| slug | VARCHAR(60) | NN, UK | Identificador de URL |

### 2.2 `evento`

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador |
| organizador_id | UUID | FK → organizador(id), NN | Responsável pelo evento |
| local | VARCHAR(160) | NULL | Endereço em texto livre ("Joinville · SC"). Nulo quando a modalidade é `online` |
| slug | VARCHAR(160) | NN, UK | URL pública; **não muda** ao renomear o evento |
| nome | VARCHAR(140) | NN | Título |
| descricao | TEXT | NN | HTML sanitizado do editor |
| modalidade | VARCHAR(12) | NN, CK ∈ {presencial, online, hibrido} | Como acontece |
| formato_online | VARCHAR(20) | NULL, CK ∈ {ao-vivo, videoconferencia, desafio-virtual, conteudo-digital} | Só para online/híbrido |
| status | VARCHAR(12) | NN, DF 'rascunho', CK ∈ {rascunho, publicado, encerrado, cancelado} | Ciclo de publicação |
| visibilidade | VARCHAR(12) | NN, DF 'publico', CK ∈ {publico, nao-listado} | Aparece ou não em listagens |
| comeca_em | TIMESTAMPTZ | NN | Início |
| termina_em | TIMESTAMPTZ | NN, CK > comeca_em | Término |
| imagem_url | TEXT | NULL | Banner; nulo usa a arte gerada |
| criado_em | TIMESTAMPTZ | NN, DF `now()` | Criação |

> [!important] CK composta
> `modalidade = 'online'` exige `local IS NULL`; `modalidade <> 'online'`
> exige `local IS NOT NULL`. `modalidade <> 'presencial'` exige
> `formato_online IS NOT NULL`.

### 2.3 `evento_categoria` *(associativa)*

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| evento_id | UUID | PK, FK → evento(id) | Evento classificado |
| categoria_id | UUID | PK, FK → categoria(id) | Categoria atribuída |

**Processo de negócio:** *Classificar evento*.

### 2.4 `lote`
Faixa de venda dentro do evento. É aqui que a concorrência é resolvida.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador |
| evento_id | UUID | FK → evento(id) ON DELETE CASCADE, NN | Evento dono |
| nome | VARCHAR(60) | NN | "Lote 1", "Pista", "Meia" |
| preco_centavos | INTEGER | NN, CK >= 0 | 0 = gratuito |
| vagas | INTEGER | NN, CK > 0 | Vagas ofertadas |
| vendidos | INTEGER | NN, DF 0, CK >= 0 | Contador de vendas |
| encerra_em | TIMESTAMPTZ | NULL | Prazo; nulo = aberto até o evento |
| ordem | SMALLINT | NN, DF 0 | Ordem de exibição |
| — | — | CK `vendidos <= vagas` | **Invariante da venda** |
| — | — | UK (evento_id, nome) | Não repete nome de lote no evento |

---

## 3. Contexto: Vendas

### 3.1 `pedido`
Carrinho e compra são a mesma entidade em estados diferentes.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador |
| comprador_id | UUID | FK → usuario(id), NN | Quem paga |
| status | VARCHAR(12) | NN, DF 'aberto', CK ∈ {aberto, confirmado, cancelado} | Estado |
| criado_em | TIMESTAMPTZ | NN, DF `now()` | Criação |
| reservado_ate | TIMESTAMPTZ | NULL | Fim da reserva de 30 min |
| confirmado_em | TIMESTAMPTZ | NULL | Momento da confirmação |
| cobranca_cpf | VARCHAR(11) | NULL | CPF do comprador, só dígitos |
| cobranca_cep | VARCHAR(8) | NULL | Só dígitos |
| cobranca_logradouro | VARCHAR(160) | NULL | Rua/avenida |
| cobranca_numero | VARCHAR(20) | NULL | Número |
| cobranca_complemento | VARCHAR(80) | NULL | Complemento |
| cobranca_bairro | VARCHAR(80) | NULL | Bairro |
| cobranca_cidade | VARCHAR(80) | NULL | Cidade |
| cobranca_uf | CHAR(2) | NULL | UF |
| — | — | CK cobrança obrigatória se `status='confirmado'` | Carrinho pode não ter; compra não |

> Os dados de cobrança são **um conjunto por pedido**, não por participante, e
> ficam no próprio pedido. São nulos enquanto o pedido é carrinho e passam a ser
> obrigatórios na confirmação — regra garantida por `CHECK`.

### 3.2 `item_pedido` *(associativa)*
Liga pedido a lote, com a quantidade e o preço congelado.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador |
| pedido_id | UUID | FK → pedido(id) ON DELETE CASCADE, NN | Pedido |
| lote_id | UUID | FK → lote(id), NN | Lote comprado |
| quantidade | INTEGER | NN, CK > 0 | Unidades |
| preco_unitario_centavos | INTEGER | NN, CK >= 0 | **Preço no momento da compra** |
| — | — | UK (pedido_id, lote_id) | Mesmo lote não duplica; incrementa quantidade |

**Processo de negócio:** *Adicionar ao carrinho*.

### 3.3 `pagamento`

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador |
| pedido_id | UUID | FK → pedido(id), NN | Pedido quitado |
| metodo | VARCHAR(10) | NN, CK ∈ {cartao, pix, boleto} | Instrumento |
| status | VARCHAR(12) | NN, DF 'pendente', CK ∈ {pendente, aprovado, recusado, estornado} | Estado |
| valor_centavos | INTEGER | NN, CK >= 0 | Valor cobrado, já com desconto |
| codigo_externo | VARCHAR(200) | NULL | Código Pix / linha digitável |
| criado_em | TIMESTAMPTZ | NN, DF `now()` | Geração |
| pago_em | TIMESTAMPTZ | NULL | Compensação |

### 3.4 `cupom`

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador |
| codigo | VARCHAR(24) | NN, UK | Código digitado no checkout (maiúsculo) |
| tipo_desconto | VARCHAR(12) | NN, CK ∈ {percentual, fixo} | Natureza do desconto |
| valor | INTEGER | NN, CK > 0 | 1–100 se percentual; centavos se fixo |
| valido_de | TIMESTAMPTZ | NN | Início da janela |
| valido_ate | TIMESTAMPTZ | NN, CK > valido_de | Fim da janela |
| limite_uso | INTEGER | NN, CK > 0 | Teto de aplicações |
| usos | INTEGER | NN, DF 0, CK >= 0 | Contador |
| ativo | BOOLEAN | NN, DF true | Desativação manual |
| criado_em | TIMESTAMPTZ | NN, DF `now()` | Criação |
| — | — | CK `usos <= limite_uso` | Não estoura o limite |
| — | — | CK percentual ⇒ valor ≤ 100 | Desconto não passa de 100% |

### 3.5 `cupom_evento` *(associativa)*
Restringe o cupom a eventos. **Ausência de linhas = vale em todos.**

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| cupom_id | UUID | PK, FK → cupom(id) ON DELETE CASCADE | Cupom |
| evento_id | UUID | PK, FK → evento(id) ON DELETE CASCADE | Evento em que vale |

**Processo de negócio:** *Restringir campanha*.

### 3.6 `uso_de_cupom` *(associativa)*
Registro de cada aplicação, por evento — é o que alimenta o relatório de cupons.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador |
| cupom_id | UUID | FK → cupom(id), NN | Cupom aplicado |
| pedido_id | UUID | FK → pedido(id), NN | Pedido que recebeu |
| evento_id | UUID | FK → evento(id), NN | Evento a que o desconto foi rateado |
| desconto_centavos | INTEGER | NN, CK >= 0 | Valor concedido nesse evento |
| usado_em | TIMESTAMPTZ | NN, DF `now()` | Momento |
| — | — | UK (cupom_id, pedido_id, evento_id) | Uma linha por trio |

**Processo de negócio:** *Aplicar cupom*.

---

## 4. Contexto: Participação

### 4.1 `inscricao` *(associativa)*
O vínculo participante × evento. Núcleo dos relatórios.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador |
| evento_id | UUID | FK → evento(id), NN | Evento |
| participante_id | UUID | FK → participante(id), NN | Quem ocupa a vaga |
| item_pedido_id | UUID | FK → item_pedido(id), NN | Item que originou |
| lote_id | UUID | FK → lote(id), NN | Lote comprado (facilita relatório) |
| preco_pago_centavos | INTEGER | NN, CK >= 0 | Valor efetivo desta vaga |
| status | VARCHAR(12) | NN, DF 'ativa', CK ∈ {ativa, cancelada} | Estado |
| como_conheceu | VARCHAR(120) | NULL | Origem declarada |
| inscrito_em | TIMESTAMPTZ | NN, DF `now()` | Data da compra |
| — | — | UK (evento_id, participante_id, item_pedido_id) | Evita inscrição duplicada |

**Processo de negócio:** *Emitir ingresso / inscrever participante*.

### 4.2 `ingresso`
Documento emitido; 1:1 com a inscrição.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador |
| inscricao_id | UUID | FK → inscricao(id) ON DELETE CASCADE, NN, UK | 1:1 |
| codigo | VARCHAR(64) | NN, UK | Conteúdo do QR de entrada |
| status | VARCHAR(12) | NN, DF 'emitido', CK ∈ {emitido, utilizado, cancelado} | Estado |
| emitido_em | TIMESTAMPTZ | NN, DF `now()` | Emissão |

### 4.3 `check_in` *(associativa)*
Presença registrada. No máximo um por ingresso.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador |
| ingresso_id | UUID | FK → ingresso(id), NN, UK | Ingresso validado |
| operador_id | UUID | FK → usuario(id), NULL | Quem operou a portaria |
| realizado_em | TIMESTAMPTZ | NN, DF `now()` | Momento da entrada |

**Processo de negócio:** *Realizar check-in*.

### 4.4 `cancelamento_de_inscricao`

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador |
| inscricao_id | UUID | FK → inscricao(id), NN | Inscrição cancelada |
| motivo | VARCHAR(200) | NULL | Justificativa |
| status | VARCHAR(12) | NN, DF 'solicitado', CK ∈ {solicitado, aprovado, negado} | Trâmite |
| solicitado_em | TIMESTAMPTZ | NN, DF `now()` | Abertura |
| resolvido_em | TIMESTAMPTZ | NULL | Fechamento |

---

## 5. Normalização

O esquema está na **3ª Forma Normal**. Justificativa por forma:

**1FN — atributos atômicos, sem grupos repetitivos.**
- Endereço de cobrança foi decomposto em colunas (`cobranca_logradouro`,
  `cobranca_numero`, `cobranca_bairro`, …) em vez de um campo de texto único.
- Lotes viraram tabela própria em vez de lista dentro do evento.
- Categorias viraram `evento_categoria` em vez de coluna multivalorada.

**2FN — sem dependência parcial de chave composta.**
- As associativas com chave composta (`evento_categoria`, `cupom_evento`) só
  têm as próprias chaves, sem atributo dependente de parte delas.
- `item_pedido` e `uso_de_cupom` usam chave substituta (`id`) com unicidade
  declarada à parte, então nenhum atributo depende de parte da chave.

**3FN — sem dependência transitiva.**
- `evento` não guarda mais nome de organizador nem nome de categoria: guarda as
  chaves estrangeiras. O `local` permanece como texto livre por decisão de
  produto — não há cadastro de locais reutilizáveis nesta fase, então não existe
  entidade da qual cidade/UF pudessem depender transitivamente.
- `inscricao` não repete nome nem e-mail do participante — aponta para
  `participante`.

### 5.1 Denormalizações deliberadas

Três valores são redundantes **por decisão**, e cada um tem justificativa:

| Coluna | Por que existe |
|---|---|
| `lote.vendidos` | Contador materializado. Recalcular por `COUNT` a cada leitura de vitrine seria caro, e a venda concorrente precisa travar **uma linha** — é a linha do lote. |
| `cupom.usos` | Mesma razão: o teto de uso é verificado a cada aplicação. |
| `item_pedido.preco_unitario_centavos` | **Não é redundância** — é fato temporal. O preço do lote muda; o do pedido já feito, não. |
| `inscricao.lote_id` e `inscricao.preco_pago_centavos` | Alcançáveis via `item_pedido`, mas presentes para que os relatórios de ocupação e receita por lote não precisem de dois JOINs adicionais em tabela de milhões de linhas. |

## 6. Índices

Além dos criados automaticamente por PK e UK:

| Índice | Tabela | Colunas | Motivo |
|---|---|---|---|
| `idx_evento_status_comeca` | evento | (status, comeca_em) | Vitrine lista publicados por data |
| `idx_evento_organizador` | evento | (organizador_id) | Painel do organizador |
| `idx_lote_evento` | lote | (evento_id) | Carregar lotes do evento |
| `idx_item_pedido_pedido` | item_pedido | (pedido_id) | Montar o pedido |
| `idx_inscricao_evento` | inscricao | (evento_id, status) | Relatório de participação |
| `idx_inscricao_participante` | inscricao | (participante_id) | "Meus ingressos" |
| `idx_ingresso_codigo` | ingresso | (codigo) | Leitura do QR no check-in |
| `idx_uso_cupom_cupom` | uso_de_cupom | (cupom_id) | Relatório de cupons |
| `idx_pagamento_pedido` | pagamento | (pedido_id) | Situação do pagamento |

## 7. Relatórios e as tabelas que cruzam

| Relatório | Tabelas envolvidas |
|---|---|
| **1. Eventos e participantes** | `evento` × `inscricao` × `ingresso` × `check_in` |
| **2. Vendas de ingressos** | `evento` × `lote` × `item_pedido` × `pedido` |
| **3. Cupons e descontos** | `cupom` × `uso_de_cupom` × `pedido` × `evento` |

## 8. Relação com outros documentos

- [[modelo-conceitual]] — entidades, relacionamentos e cardinalidades.
- [[modelo-mudancas]] — diferenças entre este modelo e o previsto antes da implementação.
- `ducktix/db/schema.sql` — DDL executável deste dicionário.
- `ducktix/db/seed.sql` — carga de dados de demonstração.
