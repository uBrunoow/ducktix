# Documentação do Ducktix

Esta pasta reúne a documentação técnica e acadêmica do estado atual do
projeto. Na **Fase 2** a persistência passou a ser MongoDB: comece por
[`migracao-postgresql-mongodb.md`](migracao-postgresql-mongodb.md). O
documento formal da Fase 1 está em `../../ENTREGA.md`.

Os documentos de modelagem relacional (`modelo-conceitual.md`,
`modelo-logico.md`, `modelo-mudancas.md`) e os planos em `superpowers/`
descrevem a Fase 1 e são mantidos como histórico.

## Entrada rápida

| Documento | Conteúdo |
|---|---|
| [`migracao-postgresql-mongodb.md`](migracao-postgresql-mongodb.md) | **Fase 2:** modelo de documentos MongoDB, decisões, queries SQL → MongoDB, validação |
| [`../database/README.md`](../database/README.md) | Scripts do banco: criação, índices, seed |
| [`estado-atual.md`](estado-atual.md) | Implementação disponível, pendências e matriz do enunciado |
| [`modelo-conceitual.md`](modelo-conceitual.md) | Entidades, relacionamentos e cardinalidades |
| [`modelo-logico.md`](modelo-logico.md) | Dicionário de dados, normalização e índices |
| [`modelo-mudancas.md`](modelo-mudancas.md) | Diferenças entre o modelo previsto e o implementado |
| [`MIGRACAO.md`](MIGRACAO.md) | Plano híbrido inicial (substituído pela migração completa) |
| [`funcionalidades.md`](funcionalidades.md) | Funcionalidades e status |
| [`fluxos.md`](fluxos.md) | Fluxos públicos e do organizador |
| [`glossario.md`](glossario.md) | Vocabulário do domínio |
| [`guidelines.md`](guidelines.md) | Convenções de desenvolvimento |
| [`DESIGN.md`](DESIGN.md) | Sistema visual e acessibilidade |

## Subpastas

- `backend/`: contratos e decisões de backend; documentos marcados como
  histórico devem ser lidos junto de `estado-atual.md`.
- `frontend/`: páginas, componentes e estado da interface.
- `diagramas/`: diagrama entidade-relacionamento em SVG/PNG.
- `superpowers/`: especificações e planos de implementação históricos.

## Regra de manutenção

Quando uma funcionalidade mudar, atualize primeiro `estado-atual.md` e depois
o documento especializado correspondente. Não mantenha avisos dizendo que o
projeto está em Discovery quando já houver implementação no código.
