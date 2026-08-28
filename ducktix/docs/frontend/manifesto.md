---
title: Frontend — Manifesto
tags:
  - ducktix
  - frontend
  - arquitetura
aliases:
  - Manifesto do Frontend
updated: 2026-08-27
---

# Frontend — Manifesto

> [!abstract] Propósito
> Stack, bibliotecas e estrutura do frontend Next.js. Convenções gerais em [[../guidelines]]; contrato consumido em [[../backend/api]].

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js (App Router) |
| UI | React |
| Linguagem | TypeScript (strict) |
| Estilo | Tailwind CSS |
| Design system | componentes reutilizáveis simples (sem sofisticação exagerada) |
| Dados | TanStack Query (ou `fetch` direto em Server Components) |
| HTTP | `fetch` contra a API Go (`NEXT_PUBLIC_API_URL`) |
| Validação | Zod (validações de UX apenas) |
| Package manager | pnpm/npm |

## Estado atual

> [!warning] Nada implementado
> ==Não existe diretório `frontend/` no repositório ainda.== O projeto está na Fase A (Discovery) do PRD — modelagem e arquitetura antes de código. Toda a estrutura abaixo é ==prevista==.

## Estrutura prevista

```
frontend/src/
  app/
    dashboard/
    events/
      new/
      [id]/
      [id]/edit/
    ticket-batches/
    tickets/
    participants/
    orders/
    check-ins/
    reports/
      events/
      sales/
      check-ins/
    layout.tsx · globals.css
  components/
    ui/          primitivas reutilizáveis
    layout/      shell, navegação
    domain/      componentes de negócio (EventCard, OrderTable, ...)
  lib/           api-client, formatters
  types/         tipos do contrato da API
```

## Princípios

> [!danger] O frontend não decide regra de negócio
> ==Não implementar validações críticas no React.== Regras como "não pode vender ingresso quando o lote acabou" vivem no domínio do backend Go. O frontend faz apenas validação de UX. Ver [[../backend/entidades]] e [[../backend/services]].

> [!danger] REST não é a interface final
> A API HTTP é um adaptador de entrada. O Next.js é a interface gráfica final da aplicação, exigida pelo PRD (seção 20/23).

Outros princípios:

- Interface administrativa simples, funcional e suficiente para demonstração acadêmica — não é necessário design sofisticado.
- Todo componente reutilizável vive em `components/`, sem duplicação.
- Priorizar usabilidade, funcionamento e clareza sobre estética.

## Comunicação com o backend

- Base URL via `NEXT_PUBLIC_API_URL`, apontando para a API HTTP em Go (ver [[../backend/api]]).
- Frontend consome os mesmos casos de uso de aplicação expostos pelo adapter HTTP; nenhuma lógica de negócio duplicada no cliente.
- Autenticação completa é opcional no PRD — não deve consumir a maior parte do esforço do frontend.

Detalhes em [[estado]].

## Documentos relacionados

[[componentes]] · [[paginas]] · [[estado]] · [[history-book]] · [[../backend/manifesto|Backend]]
