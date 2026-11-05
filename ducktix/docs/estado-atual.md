---
title: Estado atual do projeto
updated: 2026-10-01
---

# Estado atual do Ducktix

## Resumo

O Ducktix está na **Fase 2** do trabalho de Banco de Dados II: a persistência
foi migrada do PostgreSQL para o **MongoDB**. É uma aplicação web funcional para
eventos, ingressos e participantes, com o script de criação do banco
(`../database/criar-banco.js`), o seed e os testes de integração versionados
no repositório. A migração está documentada em
[`migracao-postgresql-mongodb.md`](migracao-postgresql-mongodb.md).

As linhas da tabela de requisitos abaixo referentes ao esquema relacional
descrevem a entrega da Fase 1; os arquivos citados estão agora em
`../database/legacy-postgres/`.

## O que está implementado

- Cadastro, login, sessão e edição de perfil.
- Upload de foto de perfil e capa de evento via Vercel Blob.
- Catálogo público de eventos com categorias e filtros.
- Criação, edição, publicação e cancelamento de eventos.
- Lotes pagos ou gratuitos, com preço, vagas e janela de venda.
- Adição, edição e exclusão de lotes sem vendas.
- Carrinho por pedido, reserva temporária e cancelamento de pedido.
- Checkout com participantes, cobrança, método de pagamento simulado e cupom.
- Cupons vinculados ao evento; códigos podem repetir em eventos diferentes.
- Emissão de ingresso e QR Code.
- Meus ingressos agrupados por pedido.
- Painel do organizador com eventos, lotes, pedidos, participantes e cupons.
- Check-in por QR Code na portaria.
- Relatórios de participação, vendas e cupons.
- Interface responsiva, menu mobile, favicon e transições com suporte a
  `prefers-reduced-motion`.

## Requisito acadêmico

| Requisito | Estado | Evidência |
|---|---|---|
| Domínio explorado | Completo | eventos, lotes, pedidos, participantes, pagamentos, cupons e presença |
| Esquema conceitual | Completo | `modelo-conceitual.md` e `diagramas/modelo-conceitual.svg` |
| Dicionário de dados | Completo | `modelo-logico.md` e `../db/schema.sql` |
| Banco relacional populado | Completo | `../db/seed.sql` e `../db/backup.sql` |
| Interface final não REST | Completo | Next.js, Server Components e Server Actions |
| CRUD e processos de negócio | Implementado por fluxo | rotas do organizador e checkout |
| Três relatórios com múltiplas tabelas | Completo | `/organizer/reports/events` |
| Instruções de execução | Completo | `../README.md` |

## Limites conhecidos

Os adapters de persistência (identidade, eventos, pedidos, cupons,
inscrições, ingressos e cancelamentos) são MongoDB, em
`src/server/*/infrastructure/mongo-*.ts`. Não há transação entre collections:
as garantias de concorrência são updates condicionais num único documento —
ver [`migracao-postgresql-mongodb.md`](migracao-postgresql-mongodb.md), seções
10 e 15.

Pagamentos são simulados para a demonstração acadêmica: Pix e boleto geram
identificadores de demonstração, sem gateway financeiro externo.

## Arquivos de entrega

- `../../README.md`: compilação, execução, banco e roteiro.
- `../database/criar-banco.js`: criação do banco MongoDB (collections,
  validação e índices).
- `../database/scripts/seed.mjs`: dados iniciais.
- `migracao-postgresql-mongodb.md`: relatório da migração (Fase 2).
- `../database/legacy-postgres/`: DDL, seed e backup PostgreSQL da Fase 1.
- `../../ENTREGA.md`: documento formal da Fase 1.
