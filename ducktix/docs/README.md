# Documentação do Ducktix

Esta pasta reúne a documentação técnica e acadêmica do estado atual do
projeto. O documento formal exigido pela Fase 1 está em
`../documento_entrega_fase1.md`.

## Entrada rápida

| Documento | Conteúdo |
|---|---|
| [`estado-atual.md`](estado-atual.md) | Implementação disponível, pendências e matriz do enunciado |
| [`modelo-conceitual.md`](modelo-conceitual.md) | Entidades, relacionamentos e cardinalidades |
| [`modelo-logico.md`](modelo-logico.md) | Dicionário de dados, normalização e índices |
| [`modelo-mudancas.md`](modelo-mudancas.md) | Diferenças entre o modelo previsto e o implementado |
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
