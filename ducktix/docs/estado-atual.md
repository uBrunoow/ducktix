---
title: Estado atual do projeto
updated: 2026-09-05
---

# Estado atual do Ducktix

## Resumo

O Ducktix está na Fase 1 do trabalho de Banco de Dados II. É uma aplicação web
funcional para eventos, ingressos e participantes, com PostgreSQL, migrations
Drizzle, seed e backup versionados no repositório.

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

O código possui adapters Drizzle para identidade, eventos, pedidos, cupons,
inscrições e ingressos. Algumas áreas ainda mantêm contratos de domínio e
camadas de compatibilidade em memória para testes e transição incremental.
Isso não altera o DDL nem o backup entregues; ao expandir persistência,
preservar os ports e validar os fluxos de venda com transação.

Pagamentos são simulados para a demonstração acadêmica: Pix e boleto geram
identificadores de demonstração, sem gateway financeiro externo.

## Arquivos de entrega

- `../README.md`: compilação, execução, banco, backup e roteiro.
- `../db/schema.sql`: DDL.
- `../db/seed.sql`: dados sintéticos previamente inseridos.
- `../db/backup.sql`: backup PostgreSQL sem compactação.
- `../../documento_entrega_fase1.md`: documento formal da Fase 1.
