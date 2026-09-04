---
title: Frontend — Manifesto
tags:
  - ducktix
  - frontend
  - arquitetura
aliases:
  - Manifesto do Frontend
updated: 2026-09-01
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
| Acesso a dados | Server Components e Server Actions chamando os use cases direto; `fetch` same-origin contra `/api/**` só onde a UI é client-side |
| Validação | Zod (validações de UX apenas) |
| Package manager | pnpm/npm |
| Deploy | Vercel (mesmo deploy do backend) |

## Estado atual

> [!warning] Nada implementado
> ==Não existe código no repositório ainda.== O projeto está na Fase A (Discovery) do PRD — modelagem e arquitetura antes de código. Toda a estrutura abaixo é ==prevista==.

> [!note] Frontend e backend no mesmo projeto
> Não existe um diretório `frontend/` separado: a metade client-side vive em `src/app/` e `src/components/` do mesmo projeto Next.js que hospeda `src/server/` — ver [[../backend/manifesto]].

## Estrutura prevista

```
src/
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
  lib/           api-client (client-side), formatters
  types/         tipos derivados dos use cases do servidor
```

## Princípios

> [!danger] O frontend não decide regra de negócio
> ==Não implementar validações críticas no React.== Regras como "não pode vender ingresso quando o lote acabou" vivem em `src/server/<contexto>/domain/`. O frontend faz apenas validação de UX. Ver [[../backend/entidades]] e [[../backend/services]].

> [!danger] REST não é a interface final
> Route Handlers e Server Actions são adaptadores de entrada. A interface gráfica final exigida pelo PRD (seção 20/23) são as páginas Next.js.

Outros princípios:

- Interface administrativa simples, funcional e suficiente para demonstração acadêmica — não é necessário design sofisticado.
- Todo componente reutilizável vive em `components/`, sem duplicação.
- Priorizar usabilidade, funcionamento e clareza sobre estética.

## Comunicação com o backend

- Sem base URL externa e sem `NEXT_PUBLIC_API_URL`: o backend é o mesmo processo. Server Components e Server Actions importam os use cases de `src/server/` diretamente; componentes client-side chamam `/api/**` same-origin (ver [[../backend/api]]).
- A UI nunca importa `infrastructure/` nem o client do Drizzle — só a camada `application/`.
- Frontend e CLI consomem os mesmos casos de uso; nenhuma lógica de negócio duplicada no cliente.
- Autenticação completa é opcional no PRD — não deve consumir a maior parte do esforço do frontend.

Detalhes em [[estado]].

## Documentos relacionados

[[componentes]] · [[paginas]] · [[estado]] · [[history-book]] · [[../backend/manifesto|Backend]]
