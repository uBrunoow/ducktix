# Fase 1 — Fluxo do Participante Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `/account`, `/my-tickets`, `/checkout/[id]` and `/checkout/[id]/thank-you` end-to-end (domain → application → in-memory infrastructure → Server Actions → UI), replacing their `EmConstrucao` placeholders, plus wiring "adicionar ao carrinho" on `/events/[slug]`.

**Architecture:** Two new bounded contexts under `src/server/` — `ticketing` (pedido/carrinho, item, cupom) and `participation` (ingresso emitido) — following the exact `domain/application/ports/infrastructure` layering already used by `identity` and `event`. The `event` bounded context gets a small, additive change: `Lote` gains a stable `id`, and `CatalogoPublicoRepository` gains two methods (`buscarPorId`, `registrarVenda`) so `ticketing` can look up and decrement lote availability without either context depending on the other's domain types beyond plain data.

**Tech Stack:** Next.js 15 (App Router) + TypeScript strict, React 19, Zod 4, react-hook-form, Tailwind. No test runner is installed yet — this plan adds **Vitest** (Task 1) because `docs/guidelines.md` requires domain rules to be tested and none of the new pure functions can be verified otherwise.

**Spec:** [docs/superpowers/specs/2026-09-02-fase1-participante-design.md](../specs/2026-09-02-fase1-participante-design.md)

## Global Constraints

- TypeScript strict, no `any`. Domain modules (`domain/`) have zero imports from Next.js, HTTP, or infrastructure — pure functions and interfaces only (`docs/guidelines.md`, "Camadas").
- Zod validation only at the edge (Server Actions), never inside domain (`docs/guidelines.md`).
- All new persistence is in-memory, singleton via `globalThis`, exactly like `src/server/identity/infrastructure/memoria-usuarios.ts` — trocável depois por Drizzle sem tocar domínio/aplicação.
- All identifiers, comments, error messages, and commit messages are in Brazilian Portuguese, matching existing code.
- Every bounded context folder follows `domain/`, `application/`, `ports/`, `infrastructure/`.
- No placeholders, no speculative abstraction (YAGNI) — e.g. no `Pagamento` repository since this phase has exactly one payment method (`mock`).
- Money is always integer centavos (`precoCentavos`), never floats.

---

## Task 1: Add Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `npm test` / `npx vitest run` command all later tasks use to run their tests.

- [ ] **Step 1: Install vitest**

```bash
cd ducktix && npm install -D vitest
```

- [ ] **Step 2: Add config**

Create `ducktix/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 3: Add script**

In `ducktix/package.json`, add to `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 4: Verify it runs with zero tests**

Run: `cd ducktix && npm test`
Expected: exits 0, "No test files found" is acceptable at this point (no `*.test.ts` exists yet) — if vitest errors on zero files, that's fine too, the real check is that the binary runs without a config/resolution error.

- [ ] **Step 5: Commit**

```bash
cd ducktix && git add -A -- package.json package-lock.json vitest.config.ts 2>/dev/null; git status
```

(This repo's `ducktix/` tree is currently untracked by git at the top — check `git status` output before committing; if `ducktix/` isn't tracked yet, stage normally with `git add package.json vitest.config.ts` from `ducktix/` and commit `chore: adicionar vitest`.)

---

## Task 2: `Lote` ganha `id`, catálogo vira mutável e ganha `buscarPorId`/`registrarVenda`

**Files:**
- Modify: `src/server/event/domain/evento.ts`
- Modify: `src/server/event/ports/catalogo-publico.ts`
- Modify: `src/server/event/infrastructure/seed-catalogo.ts`
- Modify: `src/app/(public)/page.tsx`
- Modify: `src/app/(public)/events/page.tsx`
- Modify: `src/app/(public)/events/[slug]/page.tsx`
- Modify: `src/app/(private)/organizer/events/page.tsx`
- Modify: `src/components/seletor-de-ingresso.tsx`
- Test: `src/server/event/infrastructure/seed-catalogo.test.ts`

**Interfaces:**
- Produces: `Lote.id: string`; `CatalogoPublicoRepository.buscarPorId(eventoId: string): Promise<Evento | null>`; `CatalogoPublicoRepository.registrarVenda(eventoId: string, loteId: string, quantidade: number): Promise<void>`; a singleton `catalogoPublicoRepository: CatalogoPublicoRepository` exported from `seed-catalogo.ts`.
- Consumes: nothing new (pure additive change to existing `event` context).

- [ ] **Step 1: Write the failing test**

Create `src/server/event/infrastructure/seed-catalogo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SeedCatalogoPublico } from './seed-catalogo';

describe('SeedCatalogoPublico', () => {
  it('cada lote de cada evento tem um id não vazio e único dentro do evento', async () => {
    const catalogo = new SeedCatalogoPublico();
    const eventos = await catalogo.listarTodos();
    for (const evento of eventos) {
      const ids = evento.lotes.map((lote) => lote.id);
      expect(ids.every((id) => id.length > 0)).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('buscarPorId encontra um evento existente e retorna null para um id inexistente', async () => {
    const catalogo = new SeedCatalogoPublico();
    const eventos = await catalogo.listarTodos();
    const primeiro = eventos[0];

    await expect(catalogo.buscarPorId(primeiro.id)).resolves.toEqual(primeiro);
    await expect(catalogo.buscarPorId('nao-existe')).resolves.toBeNull();
  });

  it('registrarVenda incrementa vendidos do lote certo sem alterar os outros lotes', async () => {
    const catalogo = new SeedCatalogoPublico();
    const eventos = await catalogo.listarTodos();
    const evento = eventos[0];
    const lote = evento.lotes[0];
    const vendidosAntes = lote.vendidos;

    await catalogo.registrarVenda(evento.id, lote.id, 2);

    const atualizado = await catalogo.buscarPorId(evento.id);
    const loteAtualizado = atualizado!.lotes.find((l) => l.id === lote.id)!;
    expect(loteAtualizado.vendidos).toBe(vendidosAntes + 2);

    const outrosLotes = atualizado!.lotes.filter((l) => l.id !== lote.id);
    const outrosOriginais = evento.lotes.filter((l) => l.id !== lote.id);
    expect(outrosLotes).toEqual(outrosOriginais);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ducktix && npx vitest run src/server/event/infrastructure/seed-catalogo.test.ts`
Expected: FAIL — `lote.id` is `undefined`, `buscarPorId`/`registrarVenda` don't exist yet.

- [ ] **Step 3: Add `id` to `Lote`**

In `src/server/event/domain/evento.ts`, change:

```ts
export interface Lote {
  readonly nome: string;
```

to:

```ts
export interface Lote {
  readonly id: string;
  readonly nome: string;
```

(no other change in this file — every function that reads `Lote` still compiles, `id` is just an added field.)

- [ ] **Step 4: Add methods to the port**

In `src/server/event/ports/catalogo-publico.ts`, replace the whole file with:

```ts
import type { Evento } from '../domain/evento';

/**
 * Port do catálogo público. A implementação atual guarda tudo em memória;
 * trocá-la pelo repositório Drizzle não altera domínio nem aplicação.
 */
export interface CatalogoPublicoRepository {
  /** Eventos publicados que começam dentro do intervalo, em ordem cronológica. */
  listarPublicados(inicio: Date, fim: Date): Promise<readonly Evento[]>;

  /** Todo o catálogo publicado, em ordem cronológica. */
  listarTodos(): Promise<readonly Evento[]>;

  /** Um evento pelo id, ou `null` se não existir. */
  buscarPorId(eventoId: string): Promise<Evento | null>;

  /**
   * Registra `quantidade` ingressos vendidos num lote específico,
   * incrementando `vendidos`. Chamado pela aplicação de `ticketing` ao
   * confirmar um pedido — não há checagem de estoque aqui, quem decide se a
   * venda pode acontecer é `loteEstaAberto` antes de chamar isto.
   */
  registrarVenda(eventoId: string, loteId: string, quantidade: number): Promise<void>;
}
```

- [ ] **Step 5: Tornar o seed mutável, dar `id` aos lotes e implementar os métodos novos**

Replace the bottom of `src/server/event/infrastructure/seed-catalogo.ts` — from `function montar(linha: LinhaDeSeed): Evento {` to the end of the file — with:

```ts
function montar(linha: LinhaDeSeed): Evento {
  const [slug, nome, organizador, categoria, modalidade, local, mes, dia, hora, capacidade, descricao, lotes] = linha;
  const construidos: Lote[] = lotes.map(([nomeLote, precoCentavos, vagas, vendidos], indice) => ({
    id: `${slug}-lote-${indice}`,
    nome: nomeLote,
    precoCentavos,
    vagas,
    vendidos,
    // Lotes anteriores ao último encerram na véspera do evento seguinte na fila.
    encerraEm: indice < lotes.length - 1 ? new Date(2026, mes, Math.max(dia - 3, 1), 23, 59) : null,
  }));

  return {
    id: slug,
    slug,
    nome,
    organizador,
    categoria,
    modalidade,
    local,
    comecaEm: new Date(2026, mes, dia, hora, 0),
    capacidade,
    descricao,
    lotes: construidos,
  };
}

/**
 * Estado mutável do catálogo em memória. `EVENTOS` era uma lista congelada;
 * agora `registrarVenda` precisa alterar `vendidos` de um lote específico
 * depois que um pedido é confirmado em `ticketing`, então o catálogo guarda
 * a lista dentro da instância (e a instância vive em `globalThis`, como
 * `usuariosRepository`), não mais numa constante de módulo compartilhada.
 */
export class SeedCatalogoPublico implements CatalogoPublicoRepository {
  private eventos: Evento[] = LINHAS.map(montar).sort(
    (a, b) => a.comecaEm.getTime() - b.comecaEm.getTime(),
  );

  async listarPublicados(inicio: Date, fim: Date): Promise<readonly Evento[]> {
    return this.eventos.filter((e) => e.comecaEm >= inicio && e.comecaEm < fim);
  }

  async listarTodos(): Promise<readonly Evento[]> {
    return this.eventos;
  }

  async buscarPorId(eventoId: string): Promise<Evento | null> {
    return this.eventos.find((e) => e.id === eventoId) ?? null;
  }

  async registrarVenda(eventoId: string, loteId: string, quantidade: number): Promise<void> {
    this.eventos = this.eventos.map((evento) => {
      if (evento.id !== eventoId) return evento;
      return {
        ...evento,
        lotes: evento.lotes.map((lote) =>
          lote.id === loteId ? { ...lote, vendidos: lote.vendidos + quantidade } : lote,
        ),
      };
    });
  }
}

const global_ = globalThis as unknown as {
  __ducktixCatalogo?: SeedCatalogoPublico;
};

export const catalogoPublicoRepository: CatalogoPublicoRepository =
  global_.__ducktixCatalogo ?? (global_.__ducktixCatalogo = new SeedCatalogoPublico());
```

Also add `Lote` to the existing top-of-file import (`import type { Evento, Lote, Modalidade } from '../domain/evento';` — it's already imported, no change needed there since `Lote` was already in that import list).

- [ ] **Step 6: Run test to verify it passes**

Run: `cd ducktix && npx vitest run src/server/event/infrastructure/seed-catalogo.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Switch the four page callers from `new SeedCatalogoPublico()` to the singleton**

In each of these four files, replace:

```ts
import { SeedCatalogoPublico } from '@/server/event/infrastructure/seed-catalogo';
```

with:

```ts
import { catalogoPublicoRepository } from '@/server/event/infrastructure/seed-catalogo';
```

and replace the line:

```ts
const catalogo = new SeedCatalogoPublico();
```

with:

```ts
const catalogo = catalogoPublicoRepository;
```

Apply this to:
- `src/app/(public)/page.tsx`
- `src/app/(public)/events/page.tsx`
- `src/app/(public)/events/[slug]/page.tsx`
- `src/app/(private)/organizer/events/page.tsx`

- [ ] **Step 8: Update `SeletorDeIngresso` to key lotes by `id` instead of `nome`**

In `src/components/seletor-de-ingresso.tsx`, replace every use of `.nome` as a lote key with `.id`:

```ts
const [escolhido, setEscolhido] = useState<string | null>(abertos[0]?.id ?? null);
```

```ts
const lote = abertos.find((l) => l.id === escolhido) ?? abertos[0];
```

```ts
function escolherLote(l: Lote) {
  setEscolhido(l.id);
  setQuantidade((atual) => Math.min(atual, Math.min(LIMITE_POR_PEDIDO, l.vagas - l.vendidos)));
}
```

```tsx
{abertos.map((l) => (
  <OpcaoDeLote
    key={l.id}
    lote={l}
    selecionado={l.id === lote.id}
    onSelecionar={() => escolherLote(l)}
  />
))}
```

(This step only renames the keying field — the "Continuar" button is still the disabled stub here; Task 9 replaces it with the real submit.)

- [ ] **Step 9: Full test run + typecheck**

Run: `cd ducktix && npx vitest run && npx tsc --noEmit`
Expected: all tests PASS, no type errors.

- [ ] **Step 10: Commit**

```bash
cd ducktix && git add src/server/event src/app/\(public\)/page.tsx "src/app/(public)/events/page.tsx" "src/app/(public)/events/[slug]/page.tsx" "src/app/(private)/organizer/events/page.tsx" src/components/seletor-de-ingresso.tsx
git commit -m "feat(event): lote ganha id estavel e catalogo vira mutavel para registrar venda"
```

---

## Task 3: Domínio `ticketing` — `Pedido`, `ItemPedido`, `Cupom` e regras puras

**Files:**
- Create: `src/server/ticketing/domain/pedido.ts`
- Create: `src/server/ticketing/domain/cupom.ts`
- Create: `src/server/ticketing/domain/erros.ts`
- Test: `src/server/ticketing/domain/pedido.test.ts`
- Test: `src/server/ticketing/domain/cupom.test.ts`

**Interfaces:**
- Produces: `Pedido`, `ItemPedido`, `StatusPedido`, `totalBrutoCentavos(pedido)`, `totalDeUnidades(pedido)`, `totalComDescontoCentavos(pedido, cupom)`; `Cupom`, `TipoDesconto`, `cupomValido(cupom, agora)`, `valorDoDescontoCentavos(cupom, totalBrutoCentavos)`; error classes `PedidoNaoEncontradoError`, `PedidoNaoPertenceAoUsuarioError`, `PedidoJaFinalizadoError`, `DadosDeParticipanteInvalidosError`, `CupomInvalidoError`.
- Consumes: nothing (pure domain, no dependency on `event` or `identity`).

- [ ] **Step 1: Write the failing tests**

Create `src/server/ticketing/domain/pedido.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { totalBrutoCentavos, totalDeUnidades, totalComDescontoCentavos } from './pedido';
import type { Cupom } from './cupom';
import type { Pedido } from './pedido';

function pedido(itens: Pedido['itens']): Pedido {
  return {
    id: 'pedido-1',
    participanteId: 'user-1',
    cupomId: null,
    status: 'aberto',
    itens,
    criadoEm: new Date('2026-09-01T10:00:00Z'),
  };
}

describe('totalBrutoCentavos', () => {
  it('soma quantidade × preço unitário de todos os itens', () => {
    const p = pedido([
      { id: 'item-1', eventoId: 'ev-1', loteId: 'lote-1', quantidade: 2, precoUnitarioCentavos: 5000 },
      { id: 'item-2', eventoId: 'ev-2', loteId: 'lote-2', quantidade: 1, precoUnitarioCentavos: 3000 },
    ]);
    expect(totalBrutoCentavos(p)).toBe(13000);
  });

  it('é zero para um pedido sem itens', () => {
    expect(totalBrutoCentavos(pedido([]))).toBe(0);
  });
});

describe('totalDeUnidades', () => {
  it('soma as quantidades de todos os itens — é quantos formulários de participante o checkout precisa', () => {
    const p = pedido([
      { id: 'item-1', eventoId: 'ev-1', loteId: 'lote-1', quantidade: 2, precoUnitarioCentavos: 5000 },
      { id: 'item-2', eventoId: 'ev-2', loteId: 'lote-2', quantidade: 3, precoUnitarioCentavos: 3000 },
    ]);
    expect(totalDeUnidades(p)).toBe(5);
  });
});

describe('totalComDescontoCentavos', () => {
  const p = pedido([
    { id: 'item-1', eventoId: 'ev-1', loteId: 'lote-1', quantidade: 2, precoUnitarioCentavos: 5000 },
  ]);

  it('sem cupom, é igual ao total bruto', () => {
    expect(totalComDescontoCentavos(p, null)).toBe(10000);
  });

  it('com cupom percentual, aplica o percentual sobre o total bruto', () => {
    const cupom: Cupom = {
      id: 'cupom-1',
      codigo: 'PROMO10',
      tipoDesconto: 'percentual',
      valor: 10,
      validoDe: new Date('2026-01-01'),
      validoAte: new Date('2027-01-01'),
      limiteDeUso: 100,
      usos: 0,
    };
    expect(totalComDescontoCentavos(p, cupom)).toBe(9000);
  });

  it('com cupom fixo, subtrai o valor fixo sem passar de zero', () => {
    const cupom: Cupom = {
      id: 'cupom-2',
      codigo: 'DEZDEZ',
      tipoDesconto: 'fixo',
      valor: 50000,
      validoDe: new Date('2026-01-01'),
      validoAte: new Date('2027-01-01'),
      limiteDeUso: 100,
      usos: 0,
    };
    expect(totalComDescontoCentavos(p, cupom)).toBe(0);
  });
});
```

Create `src/server/ticketing/domain/cupom.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cupomValido } from './cupom';
import type { Cupom } from './cupom';

function cupom(sobrescritas: Partial<Cupom> = {}): Cupom {
  return {
    id: 'cupom-1',
    codigo: 'PROMO10',
    tipoDesconto: 'percentual',
    valor: 10,
    validoDe: new Date('2026-01-01'),
    validoAte: new Date('2026-12-31'),
    limiteDeUso: 10,
    usos: 0,
    ...sobrescritas,
  };
}

describe('cupomValido', () => {
  const agora = new Date('2026-06-01');

  it('é válido dentro da janela de validade e com uso disponível', () => {
    expect(cupomValido(cupom(), agora)).toBe(true);
  });

  it('é inválido antes de validoDe', () => {
    expect(cupomValido(cupom({ validoDe: new Date('2026-07-01') }), agora)).toBe(false);
  });

  it('é inválido depois de validoAte', () => {
    expect(cupomValido(cupom({ validoAte: new Date('2026-05-01') }), agora)).toBe(false);
  });

  it('é inválido quando usos atingiu o limite', () => {
    expect(cupomValido(cupom({ limiteDeUso: 5, usos: 5 }), agora)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ducktix && npx vitest run src/server/ticketing`
Expected: FAIL — module `./pedido` and `./cupom` don't exist yet.

- [ ] **Step 3: Write `erros.ts`**

Create `src/server/ticketing/domain/erros.ts`:

```ts
/** Erros de domínio de ticketing — distintos de erros de infraestrutura. */

export class PedidoNaoEncontradoError extends Error {
  constructor() {
    super('Este pedido não existe.');
    this.name = 'PedidoNaoEncontradoError';
  }
}

export class PedidoNaoPertenceAoUsuarioError extends Error {
  constructor() {
    super('Este pedido não pertence a você.');
    this.name = 'PedidoNaoPertenceAoUsuarioError';
  }
}

export class PedidoJaFinalizadoError extends Error {
  constructor() {
    super('Este pedido já foi confirmado ou cancelado.');
    this.name = 'PedidoJaFinalizadoError';
  }
}

export class DadosDeParticipanteInvalidosError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'DadosDeParticipanteInvalidosError';
  }
}

export class CupomInvalidoError extends Error {
  constructor() {
    super('Este cupom não existe, expirou ou atingiu o limite de uso.');
    this.name = 'CupomInvalidoError';
  }
}
```

- [ ] **Step 4: Write `cupom.ts`**

Create `src/server/ticketing/domain/cupom.ts`:

```ts
/**
 * Domínio de cupom. Sem dependência de Postgres, HTTP ou React — ver
 * docs/guidelines.md, "Camadas".
 */

export type TipoDesconto = 'percentual' | 'fixo';

export interface Cupom {
  readonly id: string;
  readonly codigo: string;
  readonly tipoDesconto: TipoDesconto;
  /** Percentual (0–100) quando `tipoDesconto` é 'percentual'; centavos quando é 'fixo'. */
  readonly valor: number;
  readonly validoDe: Date;
  readonly validoAte: Date;
  readonly limiteDeUso: number;
  readonly usos: number;
}

export function cupomValido(cupom: Cupom, agora: Date): boolean {
  if (agora < cupom.validoDe || agora > cupom.validoAte) return false;
  if (cupom.usos >= cupom.limiteDeUso) return false;
  return true;
}

export function valorDoDescontoCentavos(cupom: Cupom, totalBrutoCentavos: number): number {
  if (cupom.tipoDesconto === 'percentual') {
    return Math.round((totalBrutoCentavos * cupom.valor) / 100);
  }
  return cupom.valor;
}
```

- [ ] **Step 5: Write `pedido.ts`**

Create `src/server/ticketing/domain/pedido.ts`:

```ts
/**
 * Domínio de pedido. Sem dependência de Postgres, HTTP ou React — ver
 * docs/guidelines.md, "Camadas".
 *
 * "Carrinho" não é uma entidade própria: é o Pedido do participante com
 * status 'aberto'. Ver docs/superpowers/specs/2026-09-02-fase1-participante-design.md.
 */

import type { Cupom } from './cupom';
import { valorDoDescontoCentavos } from './cupom';

export type StatusPedido = 'aberto' | 'confirmado' | 'cancelado';

export interface ItemPedido {
  readonly id: string;
  readonly eventoId: string;
  readonly loteId: string;
  readonly quantidade: number;
  /** Preço unitário congelado no momento em que o item foi adicionado. */
  readonly precoUnitarioCentavos: number;
}

export interface Pedido {
  readonly id: string;
  readonly participanteId: string;
  readonly cupomId: string | null;
  readonly status: StatusPedido;
  readonly itens: readonly ItemPedido[];
  readonly criadoEm: Date;
}

export function totalBrutoCentavos(pedido: Pedido): number {
  return pedido.itens.reduce(
    (total, item) => total + item.quantidade * item.precoUnitarioCentavos,
    0,
  );
}

/** Quantas unidades de ingresso o pedido tem ao todo — define quantos
 *  formulários de dados de participante o checkout precisa mostrar. */
export function totalDeUnidades(pedido: Pedido): number {
  return pedido.itens.reduce((total, item) => total + item.quantidade, 0);
}

export function totalComDescontoCentavos(pedido: Pedido, cupom: Cupom | null): number {
  const bruto = totalBrutoCentavos(pedido);
  if (!cupom) return bruto;
  const desconto = valorDoDescontoCentavos(cupom, bruto);
  return Math.max(0, bruto - desconto);
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd ducktix && npx vitest run src/server/ticketing`
Expected: PASS (all tests in both files).

- [ ] **Step 7: Commit**

```bash
cd ducktix && git add src/server/ticketing
git commit -m "feat(ticketing): dominio de pedido, item e cupom com calculo de total"
```

---

## Task 4: Portas + repositórios em memória de `ticketing`

**Files:**
- Create: `src/server/ticketing/ports/pedidos.ts`
- Create: `src/server/ticketing/ports/cupons.ts`
- Create: `src/server/ticketing/infrastructure/memoria-pedidos.ts`
- Create: `src/server/ticketing/infrastructure/memoria-cupons.ts`
- Test: `src/server/ticketing/infrastructure/memoria-pedidos.test.ts`
- Test: `src/server/ticketing/infrastructure/memoria-cupons.test.ts`

**Interfaces:**
- Consumes: `Pedido`, `ItemPedido`, `Cupom` from Task 3.
- Produces: `PedidosRepository` port + `pedidosRepository` singleton; `CupomRepository` port + `cupomRepository` singleton, with a seeded demo coupon `PROMO10` (percentual 10%, válido o ano de 2026, limite de uso 100).

- [ ] **Step 1: Write the failing tests**

Create `src/server/ticketing/infrastructure/memoria-pedidos.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoriaPedidosRepository } from './memoria-pedidos';

describe('MemoriaPedidosRepository', () => {
  let repo: MemoriaPedidosRepository;

  beforeEach(() => {
    repo = new MemoriaPedidosRepository();
  });

  it('cria um pedido aberto sem itens para um participante', async () => {
    const pedido = await repo.criarAberto('user-1');
    expect(pedido.participanteId).toBe('user-1');
    expect(pedido.status).toBe('aberto');
    expect(pedido.itens).toEqual([]);
  });

  it('buscarAbertoPorParticipante retorna o pedido aberto existente, ou null se não houver', async () => {
    await expect(repo.buscarAbertoPorParticipante('user-1')).resolves.toBeNull();
    const criado = await repo.criarAberto('user-1');
    await expect(repo.buscarAbertoPorParticipante('user-1')).resolves.toEqual(criado);
  });

  it('adicionarItem insere um item novo e persiste no pedido', async () => {
    const pedido = await repo.criarAberto('user-1');
    const atualizado = await repo.adicionarItem(pedido.id, {
      eventoId: 'ev-1',
      loteId: 'lote-1',
      quantidade: 2,
      precoUnitarioCentavos: 5000,
    });
    expect(atualizado.itens).toHaveLength(1);
    expect(atualizado.itens[0].quantidade).toBe(2);

    const buscado = await repo.buscarPorId(pedido.id);
    expect(buscado?.itens).toHaveLength(1);
  });

  it('adicionarItem incrementa a quantidade quando o mesmo lote já está no pedido', async () => {
    const pedido = await repo.criarAberto('user-1');
    await repo.adicionarItem(pedido.id, {
      eventoId: 'ev-1',
      loteId: 'lote-1',
      quantidade: 2,
      precoUnitarioCentavos: 5000,
    });
    const atualizado = await repo.adicionarItem(pedido.id, {
      eventoId: 'ev-1',
      loteId: 'lote-1',
      quantidade: 1,
      precoUnitarioCentavos: 5000,
    });
    expect(atualizado.itens).toHaveLength(1);
    expect(atualizado.itens[0].quantidade).toBe(3);
  });

  it('atualizarStatus e definirCupom persistem as mudanças', async () => {
    const pedido = await repo.criarAberto('user-1');
    await repo.definirCupom(pedido.id, 'cupom-1');
    await repo.atualizarStatus(pedido.id, 'confirmado');
    const buscado = await repo.buscarPorId(pedido.id);
    expect(buscado?.cupomId).toBe('cupom-1');
    expect(buscado?.status).toBe('confirmado');
  });
});
```

Create `src/server/ticketing/infrastructure/memoria-cupons.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MemoriaCupomRepository } from './memoria-cupons';

describe('MemoriaCupomRepository', () => {
  it('buscarPorCodigo encontra o cupom seed PROMO10 ignorando maiúsculas/minúsculas', async () => {
    const repo = new MemoriaCupomRepository();
    await expect(repo.buscarPorCodigo('promo10')).resolves.not.toBeNull();
    await expect(repo.buscarPorCodigo('PROMO10')).resolves.not.toBeNull();
    await expect(repo.buscarPorCodigo('nao-existe')).resolves.toBeNull();
  });

  it('incrementarUso soma 1 ao contador de usos do cupom', async () => {
    const repo = new MemoriaCupomRepository();
    const antes = await repo.buscarPorCodigo('PROMO10');
    await repo.incrementarUso(antes!.id);
    const depois = await repo.buscarPorCodigo('PROMO10');
    expect(depois!.usos).toBe(antes!.usos + 1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ducktix && npx vitest run src/server/ticketing/infrastructure`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Write the ports**

Create `src/server/ticketing/ports/pedidos.ts`:

```ts
import type { ItemPedido, Pedido, StatusPedido } from '../domain/pedido';

/**
 * Port do repositório de pedidos. A implementação atual guarda tudo em
 * memória; trocá-la pelo repositório Drizzle não altera domínio nem
 * aplicação.
 */
export interface PedidosRepository {
  criarAberto(participanteId: string): Promise<Pedido>;
  buscarPorId(pedidoId: string): Promise<Pedido | null>;
  buscarAbertoPorParticipante(participanteId: string): Promise<Pedido | null>;

  /** Adiciona um item novo, ou incrementa a quantidade se o mesmo `loteId` já está no pedido. */
  adicionarItem(
    pedidoId: string,
    item: Omit<ItemPedido, 'id'>,
  ): Promise<Pedido>;

  definirCupom(pedidoId: string, cupomId: string | null): Promise<Pedido>;
  atualizarStatus(pedidoId: string, status: StatusPedido): Promise<Pedido>;
}
```

Create `src/server/ticketing/ports/cupons.ts`:

```ts
import type { Cupom } from '../domain/cupom';

/**
 * Port do repositório de cupons. A implementação atual guarda tudo em
 * memória; trocá-la pelo repositório Drizzle não altera domínio nem
 * aplicação.
 */
export interface CupomRepository {
  buscarPorCodigo(codigo: string): Promise<Cupom | null>;
  incrementarUso(cupomId: string): Promise<void>;
}
```

- [ ] **Step 4: Write `memoria-pedidos.ts`**

Create `src/server/ticketing/infrastructure/memoria-pedidos.ts`:

```ts
import { randomUUID } from 'node:crypto';
import type { ItemPedido, Pedido, StatusPedido } from '../domain/pedido';
import type { PedidosRepository } from '../ports/pedidos';
import { PedidoNaoEncontradoError } from '../domain/erros';

/**
 * Repositório em memória — mesmo padrão de
 * src/server/identity/infrastructure/memoria-usuarios.ts. Vive pelo tempo do
 * processo do servidor.
 */
export class MemoriaPedidosRepository implements PedidosRepository {
  private readonly porId = new Map<string, Pedido>();

  async criarAberto(participanteId: string): Promise<Pedido> {
    const pedido: Pedido = {
      id: randomUUID(),
      participanteId,
      cupomId: null,
      status: 'aberto',
      itens: [],
      criadoEm: new Date(),
    };
    this.porId.set(pedido.id, pedido);
    return pedido;
  }

  async buscarPorId(pedidoId: string): Promise<Pedido | null> {
    return this.porId.get(pedidoId) ?? null;
  }

  async buscarAbertoPorParticipante(participanteId: string): Promise<Pedido | null> {
    for (const pedido of this.porId.values()) {
      if (pedido.participanteId === participanteId && pedido.status === 'aberto') {
        return pedido;
      }
    }
    return null;
  }

  async adicionarItem(pedidoId: string, item: Omit<ItemPedido, 'id'>): Promise<Pedido> {
    const pedido = this.exigir(pedidoId);
    const existente = pedido.itens.find((i) => i.loteId === item.loteId);

    const itens = existente
      ? pedido.itens.map((i) =>
          i.loteId === item.loteId ? { ...i, quantidade: i.quantidade + item.quantidade } : i,
        )
      : [...pedido.itens, { ...item, id: randomUUID() }];

    const atualizado: Pedido = { ...pedido, itens };
    this.porId.set(pedidoId, atualizado);
    return atualizado;
  }

  async definirCupom(pedidoId: string, cupomId: string | null): Promise<Pedido> {
    const pedido = this.exigir(pedidoId);
    const atualizado: Pedido = { ...pedido, cupomId };
    this.porId.set(pedidoId, atualizado);
    return atualizado;
  }

  async atualizarStatus(pedidoId: string, status: StatusPedido): Promise<Pedido> {
    const pedido = this.exigir(pedidoId);
    const atualizado: Pedido = { ...pedido, status };
    this.porId.set(pedidoId, atualizado);
    return atualizado;
  }

  private exigir(pedidoId: string): Pedido {
    const pedido = this.porId.get(pedidoId);
    if (!pedido) throw new PedidoNaoEncontradoError();
    return pedido;
  }
}

const global_ = globalThis as unknown as {
  __ducktixPedidos?: MemoriaPedidosRepository;
};

export const pedidosRepository: PedidosRepository =
  global_.__ducktixPedidos ?? (global_.__ducktixPedidos = new MemoriaPedidosRepository());
```

- [ ] **Step 5: Write `memoria-cupons.ts`**

Create `src/server/ticketing/infrastructure/memoria-cupons.ts`:

```ts
import type { Cupom } from '../domain/cupom';
import type { CupomRepository } from '../ports/cupons';

/**
 * DADOS SINTÉTICOS — cupom de demonstração da Fase 1, mesmo espírito de
 * src/server/event/infrastructure/seed-catalogo.ts. Substituir pelo seed
 * real do Postgres.
 */
const SEED: readonly Cupom[] = [
  {
    id: 'cupom-promo10',
    codigo: 'PROMO10',
    tipoDesconto: 'percentual',
    valor: 10,
    validoDe: new Date('2026-01-01'),
    validoAte: new Date('2026-12-31T23:59:59'),
    limiteDeUso: 100,
    usos: 0,
  },
];

export class MemoriaCupomRepository implements CupomRepository {
  private cupons: Cupom[] = SEED.map((c) => ({ ...c }));

  async buscarPorCodigo(codigo: string): Promise<Cupom | null> {
    const alvo = codigo.trim().toUpperCase();
    return this.cupons.find((c) => c.codigo === alvo) ?? null;
  }

  async incrementarUso(cupomId: string): Promise<void> {
    this.cupons = this.cupons.map((c) => (c.id === cupomId ? { ...c, usos: c.usos + 1 } : c));
  }
}

const global_ = globalThis as unknown as {
  __ducktixCupons?: MemoriaCupomRepository;
};

export const cupomRepository: CupomRepository =
  global_.__ducktixCupons ?? (global_.__ducktixCupons = new MemoriaCupomRepository());
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd ducktix && npx vitest run src/server/ticketing/infrastructure`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd ducktix && git add src/server/ticketing
git commit -m "feat(ticketing): repositorios em memoria de pedidos e cupons"
```

---

## Task 5: Domínio + infraestrutura de `participation` (ingresso emitido)

**Files:**
- Create: `src/server/participation/domain/ingresso.ts`
- Create: `src/server/participation/ports/ingressos.ts`
- Create: `src/server/participation/infrastructure/memoria-ingressos.ts`
- Test: `src/server/participation/domain/ingresso.test.ts`
- Test: `src/server/participation/infrastructure/memoria-ingressos.test.ts`

**Interfaces:**
- Produces: `Ingresso`, `StatusIngresso`, `cpfValido(cpf)`; `IngressosRepository` port + `memoriaIngressosRepository` singleton.
- Consumes: nothing from `ticketing` domain directly — `Ingresso.itemPedidoId` and `eventoId` are plain strings, keeping contexts decoupled.

- [ ] **Step 1: Write the failing tests**

Create `src/server/participation/domain/ingresso.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cpfValido } from './ingresso';

describe('cpfValido', () => {
  it('aceita 11 dígitos, com ou sem máscara', () => {
    expect(cpfValido('12345678901')).toBe(true);
    expect(cpfValido('123.456.789-01')).toBe(true);
  });

  it('rejeita quantidade de dígitos diferente de 11', () => {
    expect(cpfValido('123')).toBe(false);
    expect(cpfValido('123456789012')).toBe(false);
  });

  it('rejeita vazio', () => {
    expect(cpfValido('')).toBe(false);
  });
});
```

Create `src/server/participation/infrastructure/memoria-ingressos.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoriaIngressosRepository } from './memoria-ingressos';

describe('MemoriaIngressosRepository', () => {
  let repo: MemoriaIngressosRepository;

  beforeEach(() => {
    repo = new MemoriaIngressosRepository();
  });

  it('emitir cria um ingresso com status emitido', async () => {
    const ingresso = await repo.emitir({
      itemPedidoId: 'item-1',
      eventoId: 'ev-1',
      participanteNome: 'Ana Silva',
      participanteCpf: '12345678901',
    });
    expect(ingresso.status).toBe('emitido');
    expect(ingresso.id).toBeTruthy();
  });

  it('listarPorItensDePedido retorna só os ingressos dos itens pedidos', async () => {
    const a = await repo.emitir({
      itemPedidoId: 'item-1',
      eventoId: 'ev-1',
      participanteNome: 'Ana',
      participanteCpf: '12345678901',
    });
    await repo.emitir({
      itemPedidoId: 'item-2',
      eventoId: 'ev-2',
      participanteNome: 'Beto',
      participanteCpf: '10987654321',
    });

    const resultado = await repo.listarPorItensDePedido(['item-1']);
    expect(resultado).toEqual([a]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ducktix && npx vitest run src/server/participation`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Write `ingresso.ts`**

Create `src/server/participation/domain/ingresso.ts`:

```ts
/**
 * Domínio de participação: o ingresso emitido. Sem dependência de Postgres,
 * HTTP ou React — ver docs/guidelines.md, "Camadas".
 */

export type StatusIngresso = 'emitido' | 'cancelado' | 'utilizado';

export interface Ingresso {
  readonly id: string;
  /** Item de pedido (em ticketing) que originou este ingresso. */
  readonly itemPedidoId: string;
  readonly eventoId: string;
  /** Quem vai usar o ingresso — não precisa ser quem comprou. */
  readonly participanteNome: string;
  readonly participanteCpf: string;
  readonly status: StatusIngresso;
  readonly emitidoEm: Date;
}

/** Só formato (11 dígitos, com ou sem máscara) — sem dígito verificador,
 *  fora de escopo desta fase. */
export function cpfValido(cpf: string): boolean {
  const digitos = cpf.replace(/\D/g, '');
  return digitos.length === 11;
}
```

- [ ] **Step 4: Write the port and in-memory repo**

Create `src/server/participation/ports/ingressos.ts`:

```ts
import type { Ingresso } from '../domain/ingresso';

/**
 * Port do repositório de ingressos. A implementação atual guarda tudo em
 * memória; trocá-la pelo repositório Drizzle não altera domínio nem
 * aplicação.
 */
export interface IngressosRepository {
  emitir(dados: {
    itemPedidoId: string;
    eventoId: string;
    participanteNome: string;
    participanteCpf: string;
  }): Promise<Ingresso>;

  listarPorItensDePedido(itemPedidoIds: readonly string[]): Promise<readonly Ingresso[]>;
}
```

Create `src/server/participation/infrastructure/memoria-ingressos.ts`:

```ts
import { randomUUID } from 'node:crypto';
import type { Ingresso } from '../domain/ingresso';
import type { IngressosRepository } from '../ports/ingressos';

/** Repositório em memória — mesmo padrão de identity/event/ticketing. */
export class MemoriaIngressosRepository implements IngressosRepository {
  private readonly ingressos: Ingresso[] = [];

  async emitir(dados: {
    itemPedidoId: string;
    eventoId: string;
    participanteNome: string;
    participanteCpf: string;
  }): Promise<Ingresso> {
    const ingresso: Ingresso = {
      id: randomUUID(),
      ...dados,
      status: 'emitido',
      emitidoEm: new Date(),
    };
    this.ingressos.push(ingresso);
    return ingresso;
  }

  async listarPorItensDePedido(itemPedidoIds: readonly string[]): Promise<readonly Ingresso[]> {
    const alvo = new Set(itemPedidoIds);
    return this.ingressos.filter((i) => alvo.has(i.itemPedidoId));
  }
}

const global_ = globalThis as unknown as {
  __ducktixIngressos?: MemoriaIngressosRepository;
};

export const memoriaIngressosRepository: IngressosRepository =
  global_.__ducktixIngressos ?? (global_.__ducktixIngressos = new MemoriaIngressosRepository());
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd ducktix && npx vitest run src/server/participation`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd ducktix && git add src/server/participation
git commit -m "feat(participation): dominio e repositorio em memoria de ingressos"
```

---

## Task 6: Aplicação — `adicionarAoCarrinho`

**Files:**
- Create: `src/server/ticketing/application/carrinho.ts`
- Test: `src/server/ticketing/application/carrinho.test.ts`

**Interfaces:**
- Consumes: `PedidosRepository` (Task 4), `Evento`/`Lote`/`loteEstaAberto` from `event` domain, `CatalogoPublicoRepository.buscarPorId` (Task 2).
- Produces: `adicionarAoCarrinho(pedidos: PedidosRepository, catalogo: CatalogoPublicoRepository, participanteId: string, eventoId: string, loteId: string, quantidade: number, agora: Date): Promise<Pedido>`.

- [ ] **Step 1: Write the failing test**

Create `src/server/ticketing/application/carrinho.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { adicionarAoCarrinho } from './carrinho';
import { MemoriaPedidosRepository } from '../infrastructure/memoria-pedidos';
import { SeedCatalogoPublico } from '@/server/event/infrastructure/seed-catalogo';

describe('adicionarAoCarrinho', () => {
  let pedidos: MemoriaPedidosRepository;
  let catalogo: SeedCatalogoPublico;
  const agora = new Date('2026-01-01');

  beforeEach(() => {
    pedidos = new MemoriaPedidosRepository();
    catalogo = new SeedCatalogoPublico();
  });

  it('cria o pedido aberto do participante na primeira chamada e adiciona o item', async () => {
    const eventos = await catalogo.listarTodos();
    const evento = eventos.find((e) => e.lotes.some((l) => l.vagas > l.vendidos))!;
    const lote = evento.lotes.find((l) => l.vagas > l.vendidos)!;

    const pedido = await adicionarAoCarrinho(pedidos, catalogo, 'user-1', evento.id, lote.id, 2, agora);

    expect(pedido.status).toBe('aberto');
    expect(pedido.itens).toHaveLength(1);
    expect(pedido.itens[0].precoUnitarioCentavos).toBe(lote.precoCentavos);
  });

  it('reaproveita o pedido aberto existente em vez de criar outro', async () => {
    const eventos = await catalogo.listarTodos();
    const evento = eventos.find((e) => e.lotes.some((l) => l.vagas > l.vendidos))!;
    const lote = evento.lotes.find((l) => l.vagas > l.vendidos)!;

    const primeiro = await adicionarAoCarrinho(pedidos, catalogo, 'user-1', evento.id, lote.id, 1, agora);
    const segundo = await adicionarAoCarrinho(pedidos, catalogo, 'user-1', evento.id, lote.id, 1, agora);

    expect(segundo.id).toBe(primeiro.id);
    expect(segundo.itens[0].quantidade).toBe(2);
  });

  it('lança erro se o evento não existir', async () => {
    await expect(
      adicionarAoCarrinho(pedidos, catalogo, 'user-1', 'nao-existe', 'lote-x', 1, agora),
    ).rejects.toThrow();
  });

  it('lança erro se o lote não estiver aberto (esgotado ou fora do período)', async () => {
    const eventos = await catalogo.listarTodos();
    const evento = eventos.find((e) => e.lotes.some((l) => l.vagas <= l.vendidos))!;
    const loteEsgotado = evento.lotes.find((l) => l.vagas <= l.vendidos)!;

    await expect(
      adicionarAoCarrinho(pedidos, catalogo, 'user-1', evento.id, loteEsgotado.id, 1, agora),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ducktix && npx vitest run src/server/ticketing/application/carrinho.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write `carrinho.ts`**

Create `src/server/ticketing/application/carrinho.ts`:

```ts
import type { CatalogoPublicoRepository } from '@/server/event/ports/catalogo-publico';
import { loteEstaAberto } from '@/server/event/domain/evento';
import type { Pedido } from '../domain/pedido';
import type { PedidosRepository } from '../ports/pedidos';

export class EventoNaoEncontradoError extends Error {
  constructor() {
    super('Este evento não existe.');
    this.name = 'EventoNaoEncontradoError';
  }
}

export class LoteIndisponivelError extends Error {
  constructor() {
    super('Este lote não está disponível para compra no momento.');
    this.name = 'LoteIndisponivelError';
  }
}

/**
 * "Adicionar ao carrinho": encontra ou cria o pedido aberto do participante e
 * adiciona (ou incrementa) o item. Carrinho não é uma entidade própria — é
 * este pedido com status 'aberto'.
 */
export async function adicionarAoCarrinho(
  pedidos: PedidosRepository,
  catalogo: CatalogoPublicoRepository,
  participanteId: string,
  eventoId: string,
  loteId: string,
  quantidade: number,
  agora: Date,
): Promise<Pedido> {
  const evento = await catalogo.buscarPorId(eventoId);
  if (!evento) throw new EventoNaoEncontradoError();

  const lote = evento.lotes.find((l) => l.id === loteId);
  if (!lote || !loteEstaAberto(lote, agora)) throw new LoteIndisponivelError();

  const existente = await pedidos.buscarAbertoPorParticipante(participanteId);
  const pedido = existente ?? (await pedidos.criarAberto(participanteId));

  return pedidos.adicionarItem(pedido.id, {
    eventoId,
    loteId,
    quantidade,
    precoUnitarioCentavos: lote.precoCentavos,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ducktix && npx vitest run src/server/ticketing/application/carrinho.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd ducktix && git add src/server/ticketing/application
git commit -m "feat(ticketing): aplicacao adicionarAoCarrinho"
```

---

## Task 7: Aplicação — `aplicarCupom` e `confirmarPedido`

**Files:**
- Create: `src/server/ticketing/application/checkout.ts`
- Test: `src/server/ticketing/application/checkout.test.ts`

**Interfaces:**
- Consumes: `PedidosRepository`, `CupomRepository` (Task 4), `IngressosRepository` (Task 5), `CatalogoPublicoRepository.registrarVenda` (Task 2), domain functions from Task 3.
- Produces: `aplicarCupom(pedidos, cupons, pedidoId, participanteId, codigo, agora): Promise<Pedido>`; `DadosDeParticipante { nome: string; cpf: string }`; `confirmarPedido(deps, pedidoId, participanteId, dadosParticipantes: readonly DadosDeParticipante[], agora): Promise<{ pedido: Pedido; ingressos: readonly Ingresso[] }>`.

- [ ] **Step 1: Write the failing test**

Create `src/server/ticketing/application/checkout.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { aplicarCupom, confirmarPedido } from './checkout';
import { adicionarAoCarrinho } from './carrinho';
import { MemoriaPedidosRepository } from '../infrastructure/memoria-pedidos';
import { MemoriaCupomRepository } from '../infrastructure/memoria-cupons';
import { MemoriaIngressosRepository } from '@/server/participation/infrastructure/memoria-ingressos';
import { SeedCatalogoPublico } from '@/server/event/infrastructure/seed-catalogo';
import {
  PedidoJaFinalizadoError,
  PedidoNaoPertenceAoUsuarioError,
} from '../domain/erros';

describe('checkout', () => {
  let pedidos: MemoriaPedidosRepository;
  let cupons: MemoriaCupomRepository;
  let ingressos: MemoriaIngressosRepository;
  let catalogo: SeedCatalogoPublico;
  const agora = new Date('2026-01-01');

  beforeEach(() => {
    pedidos = new MemoriaPedidosRepository();
    cupons = new MemoriaCupomRepository();
    ingressos = new MemoriaIngressosRepository();
    catalogo = new SeedCatalogoPublico();
  });

  async function pedidoComUmItem(quantidade = 1) {
    const eventos = await catalogo.listarTodos();
    const evento = eventos.find((e) => e.lotes.some((l) => l.vagas - l.vendidos >= quantidade))!;
    const lote = evento.lotes.find((l) => l.vagas - l.vendidos >= quantidade)!;
    const pedido = await adicionarAoCarrinho(pedidos, catalogo, 'user-1', evento.id, lote.id, quantidade, agora);
    return { pedido, evento, lote };
  }

  it('aplicarCupom associa um cupom válido ao pedido', async () => {
    const { pedido } = await pedidoComUmItem();
    const atualizado = await aplicarCupom(pedidos, cupons, pedido.id, 'user-1', 'PROMO10', agora);
    expect(atualizado.cupomId).toBe('cupom-promo10');
  });

  it('aplicarCupom rejeita código inexistente', async () => {
    const { pedido } = await pedidoComUmItem();
    await expect(
      aplicarCupom(pedidos, cupons, pedido.id, 'user-1', 'NAO-EXISTE', agora),
    ).rejects.toThrow();
  });

  it('confirmarPedido emite um ingresso por unidade, confirma o pedido e decrementa o lote', async () => {
    const { pedido, evento, lote } = await pedidoComUmItem(2);
    const vendidosAntes = lote.vendidos;

    const resultado = await confirmarPedido(
      { pedidos, cupons, ingressos, catalogo },
      pedido.id,
      'user-1',
      [
        { nome: 'Ana Silva', cpf: '12345678901' },
        { nome: 'Beto Souza', cpf: '10987654321' },
      ],
      agora,
    );

    expect(resultado.pedido.status).toBe('confirmado');
    expect(resultado.ingressos).toHaveLength(2);

    const eventoAtualizado = await catalogo.buscarPorId(evento.id);
    const loteAtualizado = eventoAtualizado!.lotes.find((l) => l.id === lote.id)!;
    expect(loteAtualizado.vendidos).toBe(vendidosAntes + 2);
  });

  it('confirmarPedido rejeita se a quantidade de dados de participante não bate com o total de unidades', async () => {
    const { pedido } = await pedidoComUmItem(2);
    await expect(
      confirmarPedido(
        { pedidos, cupons, ingressos, catalogo },
        pedido.id,
        'user-1',
        [{ nome: 'Ana Silva', cpf: '12345678901' }],
        agora,
      ),
    ).rejects.toThrow();
  });

  it('confirmarPedido rejeita pedido de outro participante', async () => {
    const { pedido } = await pedidoComUmItem(1);
    await expect(
      confirmarPedido(
        { pedidos, cupons, ingressos, catalogo },
        pedido.id,
        'outro-user',
        [{ nome: 'Ana Silva', cpf: '12345678901' }],
        agora,
      ),
    ).rejects.toThrow(PedidoNaoPertenceAoUsuarioError);
  });

  it('confirmarPedido rejeita pedido que já não está aberto', async () => {
    const { pedido } = await pedidoComUmItem(1);
    await confirmarPedido(
      { pedidos, cupons, ingressos, catalogo },
      pedido.id,
      'user-1',
      [{ nome: 'Ana Silva', cpf: '12345678901' }],
      agora,
    );
    await expect(
      confirmarPedido(
        { pedidos, cupons, ingressos, catalogo },
        pedido.id,
        'user-1',
        [{ nome: 'Ana Silva', cpf: '12345678901' }],
        agora,
      ),
    ).rejects.toThrow(PedidoJaFinalizadoError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ducktix && npx vitest run src/server/ticketing/application/checkout.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write `checkout.ts`**

Create `src/server/ticketing/application/checkout.ts`:

```ts
import type { CatalogoPublicoRepository } from '@/server/event/ports/catalogo-publico';
import type { Ingresso } from '@/server/participation/domain/ingresso';
import { cpfValido } from '@/server/participation/domain/ingresso';
import type { IngressosRepository } from '@/server/participation/ports/ingressos';
import { cupomValido } from '../domain/cupom';
import {
  CupomInvalidoError,
  DadosDeParticipanteInvalidosError,
  PedidoJaFinalizadoError,
  PedidoNaoEncontradoError,
  PedidoNaoPertenceAoUsuarioError,
} from '../domain/erros';
import { totalDeUnidades, type Pedido } from '../domain/pedido';
import type { CupomRepository } from '../ports/cupons';
import type { PedidosRepository } from '../ports/pedidos';

export interface DadosDeParticipante {
  readonly nome: string;
  readonly cpf: string;
}

function exigirPedidoAbertoDoUsuario(pedido: Pedido | null, participanteId: string): Pedido {
  if (!pedido) throw new PedidoNaoEncontradoError();
  if (pedido.participanteId !== participanteId) throw new PedidoNaoPertenceAoUsuarioError();
  if (pedido.status !== 'aberto') throw new PedidoJaFinalizadoError();
  return pedido;
}

export async function aplicarCupom(
  pedidos: PedidosRepository,
  cupons: CupomRepository,
  pedidoId: string,
  participanteId: string,
  codigo: string,
  agora: Date,
): Promise<Pedido> {
  const pedido = exigirPedidoAbertoDoUsuario(await pedidos.buscarPorId(pedidoId), participanteId);

  const cupom = await cupons.buscarPorCodigo(codigo);
  if (!cupom || !cupomValido(cupom, agora)) throw new CupomInvalidoError();

  return pedidos.definirCupom(pedido.id, cupom.id);
}

export interface DependenciasDoCheckout {
  readonly pedidos: PedidosRepository;
  readonly cupons: CupomRepository;
  readonly ingressos: IngressosRepository;
  readonly catalogo: CatalogoPublicoRepository;
}

/**
 * Confirma o pedido: valida um dado de participante por unidade comprada,
 * marca o pedido como confirmado, registra a venda em cada lote (decrementa
 * vagas) e emite um ingresso por unidade. Pagamento é mock instantâneo — não
 * há gateway nesta fase, confirmar já é "pago".
 */
export async function confirmarPedido(
  deps: DependenciasDoCheckout,
  pedidoId: string,
  participanteId: string,
  dadosParticipantes: readonly DadosDeParticipante[],
  agora: Date,
): Promise<{ pedido: Pedido; ingressos: readonly Ingresso[] }> {
  const pedido = exigirPedidoAbertoDoUsuario(
    await deps.pedidos.buscarPorId(pedidoId),
    participanteId,
  );

  const unidades = totalDeUnidades(pedido);
  if (dadosParticipantes.length !== unidades) {
    throw new DadosDeParticipanteInvalidosError(
      `Informe os dados de ${unidades} participante(s) — foram enviados ${dadosParticipantes.length}.`,
    );
  }
  for (const dado of dadosParticipantes) {
    if (dado.nome.trim().length < 2) {
      throw new DadosDeParticipanteInvalidosError('Informe o nome completo de cada participante.');
    }
    if (!cpfValido(dado.cpf)) {
      throw new DadosDeParticipanteInvalidosError('Informe um CPF válido (11 dígitos) para cada participante.');
    }
  }

  if (pedido.cupomId) {
    await deps.cupons.incrementarUso(pedido.cupomId);
  }

  const ingressosEmitidos: Ingresso[] = [];
  let indiceParticipante = 0;
  for (const item of pedido.itens) {
    await deps.catalogo.registrarVenda(item.eventoId, item.loteId, item.quantidade);
    for (let i = 0; i < item.quantidade; i++) {
      const dado = dadosParticipantes[indiceParticipante];
      indiceParticipante++;
      const ingresso = await deps.ingressos.emitir({
        itemPedidoId: item.id,
        eventoId: item.eventoId,
        participanteNome: dado.nome.trim(),
        participanteCpf: dado.cpf.replace(/\D/g, ''),
      });
      ingressosEmitidos.push(ingresso);
    }
  }

  const confirmado = await deps.pedidos.atualizarStatus(pedido.id, 'confirmado');
  return { pedido: confirmado, ingressos: ingressosEmitidos };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ducktix && npx vitest run src/server/ticketing/application/checkout.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Full suite + typecheck**

Run: `cd ducktix && npx vitest run && npx tsc --noEmit`
Expected: all PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
cd ducktix && git add src/server/ticketing/application
git commit -m "feat(ticketing): aplicacao aplicarCupom e confirmarPedido"
```

---

## Task 8: Aplicação — `listarIngressosDoParticipante`

**Files:**
- Create: `src/server/participation/application/meus-ingressos.ts`
- Test: `src/server/participation/application/meus-ingressos.test.ts`

**Interfaces:**
- Consumes: `PedidosRepository` (Task 4), `IngressosRepository` (Task 5).
- Produces: `IngressoComEvento { ingresso: Ingresso; eventoId: string }`; `listarIngressosDoParticipante(pedidos, ingressos, participanteId): Promise<readonly IngressoComEvento[]>`.

- [ ] **Step 1: Write the failing test**

Create `src/server/participation/application/meus-ingressos.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { listarIngressosDoParticipante } from './meus-ingressos';
import { MemoriaPedidosRepository } from '@/server/ticketing/infrastructure/memoria-pedidos';
import { MemoriaIngressosRepository } from '../infrastructure/memoria-ingressos';

describe('listarIngressosDoParticipante', () => {
  let pedidos: MemoriaPedidosRepository;
  let ingressos: MemoriaIngressosRepository;

  beforeEach(() => {
    pedidos = new MemoriaPedidosRepository();
    ingressos = new MemoriaIngressosRepository();
  });

  it('retorna vazio quando o participante não tem nenhum pedido', async () => {
    await expect(listarIngressosDoParticipante(pedidos, ingressos, 'user-1')).resolves.toEqual([]);
  });

  it('retorna os ingressos emitidos para os pedidos do participante, mesmo emitidos para terceiros', async () => {
    const pedido = await pedidos.criarAberto('user-1');
    const comItem = await pedidos.adicionarItem(pedido.id, {
      eventoId: 'ev-1',
      loteId: 'lote-1',
      quantidade: 1,
      precoUnitarioCentavos: 5000,
    });
    await pedidos.atualizarStatus(comItem.id, 'confirmado');
    await ingressos.emitir({
      itemPedidoId: comItem.itens[0].id,
      eventoId: 'ev-1',
      participanteNome: 'Terceiro Convidado',
      participanteCpf: '12345678901',
    });

    const resultado = await listarIngressosDoParticipante(pedidos, ingressos, 'user-1');
    expect(resultado).toHaveLength(1);
    expect(resultado[0].ingresso.participanteNome).toBe('Terceiro Convidado');
    expect(resultado[0].eventoId).toBe('ev-1');
  });

  it('não retorna ingressos de pedidos de outro participante', async () => {
    const pedidoOutro = await pedidos.criarAberto('outro-user');
    const comItem = await pedidos.adicionarItem(pedidoOutro.id, {
      eventoId: 'ev-1',
      loteId: 'lote-1',
      quantidade: 1,
      precoUnitarioCentavos: 5000,
    });
    await ingressos.emitir({
      itemPedidoId: comItem.itens[0].id,
      eventoId: 'ev-1',
      participanteNome: 'Alguém',
      participanteCpf: '12345678901',
    });

    await expect(listarIngressosDoParticipante(pedidos, ingressos, 'user-1')).resolves.toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ducktix && npx vitest run src/server/participation/application`
Expected: FAIL — module doesn't exist. Note: this test needs a way to enumerate all pedidos by participant, which `PedidosRepository` doesn't expose yet (Task 4 only added `buscarAbertoPorParticipante`, singular open order). Before writing the implementation, extend the port.

- [ ] **Step 3: Extend `PedidosRepository` with `listarPorParticipante`**

In `src/server/ticketing/ports/pedidos.ts`, add to the interface:

```ts
  /** Todos os pedidos do participante, em qualquer status, mais recentes primeiro. */
  listarPorParticipante(participanteId: string): Promise<readonly Pedido[]>;
```

In `src/server/ticketing/infrastructure/memoria-pedidos.ts`, add the method to the class:

```ts
  async listarPorParticipante(participanteId: string): Promise<readonly Pedido[]> {
    return [...this.porId.values()]
      .filter((p) => p.participanteId === participanteId)
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
  }
```

Add a test for it in `src/server/ticketing/infrastructure/memoria-pedidos.test.ts` (append):

```ts
  it('listarPorParticipante retorna todos os pedidos do participante, mais recentes primeiro', async () => {
    const primeiro = await repo.criarAberto('user-1');
    await new Promise((r) => setTimeout(r, 2));
    const segundo = await repo.criarAberto('user-1');
    await repo.criarAberto('outro-user');

    const resultado = await repo.listarPorParticipante('user-1');
    expect(resultado.map((p) => p.id)).toEqual([segundo.id, primeiro.id]);
  });
```

Run: `cd ducktix && npx vitest run src/server/ticketing/infrastructure/memoria-pedidos.test.ts`
Expected: PASS.

- [ ] **Step 4: Write `meus-ingressos.ts`**

Create `src/server/participation/application/meus-ingressos.ts`:

```ts
import type { PedidosRepository } from '@/server/ticketing/ports/pedidos';
import type { Ingresso } from '../domain/ingresso';
import type { IngressosRepository } from '../ports/ingressos';

export interface IngressoComEvento {
  readonly ingresso: Ingresso;
  readonly eventoId: string;
}

/**
 * Ingressos do usuário logado: por dono do pedido, não por nome no ingresso
 * — um usuário vê os ingressos que comprou, mesmo os emitidos para
 * terceiros. Ver docs/superpowers/specs/2026-09-02-fase1-participante-design.md.
 */
export async function listarIngressosDoParticipante(
  pedidos: PedidosRepository,
  ingressos: IngressosRepository,
  participanteId: string,
): Promise<readonly IngressoComEvento[]> {
  const pedidosDoUsuario = await pedidos.listarPorParticipante(participanteId);
  const itemIds = pedidosDoUsuario.flatMap((p) => p.itens.map((i) => i.id));
  if (itemIds.length === 0) return [];

  const emitidos = await ingressos.listarPorItensDePedido(itemIds);
  return emitidos.map((ingresso) => ({ ingresso, eventoId: ingresso.eventoId }));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd ducktix && npx vitest run src/server/participation && npx vitest run src/server/ticketing/infrastructure`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd ducktix && git add src/server/ticketing/ports/pedidos.ts src/server/ticketing/infrastructure/memoria-pedidos.ts src/server/ticketing/infrastructure/memoria-pedidos.test.ts src/server/participation/application
git commit -m "feat(participation): listar ingressos do participante logado"
```

---

## Task 9: Identity — `atualizarPerfil` e `alterarSenha`

**Files:**
- Create: `src/server/identity/application/atualizar-perfil.ts`
- Create: `src/server/identity/application/alterar-senha.ts`
- Test: `src/server/identity/application/atualizar-perfil.test.ts`
- Test: `src/server/identity/application/alterar-senha.test.ts`

**Interfaces:**
- Consumes: `UsuariosRepository` (existing, needs one addition — see Step 3), `senhaConfere`/`hashDaSenha` (existing), `senhaForteOsuficiente` (existing).
- Produces: `atualizarNome(repo, usuarioId, novoNome): Promise<Usuario>`; `alterarSenha(repo, usuarioId, senhaAtual, novaSenha): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

Create `src/server/identity/application/atualizar-perfil.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { atualizarNome } from './atualizar-perfil';
import { MemoriaUsuariosRepository } from '../infrastructure/memoria-usuarios';
import { hashDaSenha } from '../domain/senha';
import { DadosDeEntradaInvalidosError } from '../domain/erros';

describe('atualizarNome', () => {
  it('atualiza o nome do usuário', async () => {
    const repo = new MemoriaUsuariosRepository();
    const usuario = await repo.criar({
      nome: 'Nome Antigo',
      email: 'ana@example.com',
      papel: 'participante',
      senhaHash: hashDaSenha('senha1234'),
    });

    const atualizado = await atualizarNome(repo, usuario.id, 'Nome Novo');
    expect(atualizado.nome).toBe('Nome Novo');
  });

  it('rejeita nome muito curto', async () => {
    const repo = new MemoriaUsuariosRepository();
    const usuario = await repo.criar({
      nome: 'Nome Antigo',
      email: 'ana@example.com',
      papel: 'participante',
      senhaHash: hashDaSenha('senha1234'),
    });

    await expect(atualizarNome(repo, usuario.id, 'A')).rejects.toThrow(DadosDeEntradaInvalidosError);
  });
});
```

Create `src/server/identity/application/alterar-senha.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { alterarSenha } from './alterar-senha';
import { MemoriaUsuariosRepository } from '../infrastructure/memoria-usuarios';
import { hashDaSenha, senhaConfere } from '../domain/senha';
import { CredenciaisInvalidasError, DadosDeEntradaInvalidosError } from '../domain/erros';

describe('alterarSenha', () => {
  async function usuarioComSenha(senha: string) {
    const repo = new MemoriaUsuariosRepository();
    const usuario = await repo.criar({
      nome: 'Ana',
      email: 'ana@example.com',
      papel: 'participante',
      senhaHash: hashDaSenha(senha),
    });
    return { repo, usuario };
  }

  it('troca a senha quando a senha atual confere', async () => {
    const { repo, usuario } = await usuarioComSenha('senhaAntiga1');
    await alterarSenha(repo, usuario.id, 'senhaAntiga1', 'senhaNova12');

    const atualizado = await repo.buscarPorId(usuario.id);
    expect(senhaConfere('senhaNova12', atualizado!.senhaHash)).toBe(true);
  });

  it('rejeita quando a senha atual está errada', async () => {
    const { repo, usuario } = await usuarioComSenha('senhaAntiga1');
    await expect(
      alterarSenha(repo, usuario.id, 'senha-errada', 'senhaNova12'),
    ).rejects.toThrow(CredenciaisInvalidasError);
  });

  it('rejeita nova senha fraca', async () => {
    const { repo, usuario } = await usuarioComSenha('senhaAntiga1');
    await expect(
      alterarSenha(repo, usuario.id, 'senhaAntiga1', 'curta'),
    ).rejects.toThrow(DadosDeEntradaInvalidosError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ducktix && npx vitest run src/server/identity/application/atualizar-perfil.test.ts src/server/identity/application/alterar-senha.test.ts`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Add `atualizarNome` to `UsuariosRepository` and its in-memory implementation**

In `src/server/identity/ports/usuarios.ts`, add to the interface (after `atualizarSenha`):

```ts
  atualizarNome(usuarioId: string, nome: string): Promise<Usuario>;
```

In `src/server/identity/infrastructure/memoria-usuarios.ts`, add to the class (after `atualizarSenha`):

```ts
  async atualizarNome(usuarioId: string, nome: string): Promise<Usuario> {
    const usuario = this.porId.get(usuarioId);
    if (!usuario) throw new Error('Usuário não encontrado.');
    const atualizado: Usuario = { ...usuario, nome };
    this.porId.set(atualizado.id, atualizado);
    this.porEmail.set(atualizado.email, atualizado);
    return atualizado;
  }
```

- [ ] **Step 4: Write `atualizar-perfil.ts`**

Create `src/server/identity/application/atualizar-perfil.ts`:

```ts
import { DadosDeEntradaInvalidosError } from '../domain/erros';
import type { Usuario } from '../domain/usuario';
import type { UsuariosRepository } from '../ports/usuarios';

export async function atualizarNome(
  repo: UsuariosRepository,
  usuarioId: string,
  novoNome: string,
): Promise<Usuario> {
  const nome = novoNome.trim();
  if (nome.length < 2) {
    throw new DadosDeEntradaInvalidosError('Informe seu nome.');
  }
  return repo.atualizarNome(usuarioId, nome);
}
```

- [ ] **Step 5: Write `alterar-senha.ts`**

Create `src/server/identity/application/alterar-senha.ts`:

```ts
import { CredenciaisInvalidasError, DadosDeEntradaInvalidosError } from '../domain/erros';
import { hashDaSenha, senhaConfere } from '../domain/senha';
import { senhaForteOsuficiente } from '../domain/usuario';
import type { UsuariosRepository } from '../ports/usuarios';

export async function alterarSenha(
  repo: UsuariosRepository,
  usuarioId: string,
  senhaAtual: string,
  novaSenha: string,
): Promise<void> {
  const usuario = await repo.buscarPorId(usuarioId);
  if (!usuario || !senhaConfere(senhaAtual, usuario.senhaHash)) {
    throw new CredenciaisInvalidasError();
  }
  if (!senhaForteOsuficiente(novaSenha)) {
    throw new DadosDeEntradaInvalidosError('A nova senha precisa ter ao menos 8 caracteres.');
  }
  await repo.atualizarSenha(usuarioId, hashDaSenha(novaSenha));
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd ducktix && npx vitest run src/server/identity`
Expected: PASS (all identity tests, including these two new files).

- [ ] **Step 7: Commit**

```bash
cd ducktix && git add src/server/identity
git commit -m "feat(identity): atualizar nome e alterar senha do usuario logado"
```

---

## Task 10: Server Action + UI — "Adicionar ao carrinho" em `/events/[slug]`

**Files:**
- Create: `src/app/(public)/events/[slug]/acoes.ts`
- Modify: `src/components/seletor-de-ingresso.tsx`

**Interfaces:**
- Consumes: `adicionarAoCarrinho` (Task 6), `pedidosRepository` (Task 4), `catalogoPublicoRepository` (Task 2), `sessaoAtual` (existing).
- Produces: Server Action `acaoAdicionarAoCarrinho(dados: { eventoId: string; loteId: string; quantidade: number }): Promise<{ erro?: string }>` that redirects on success.

No unit test here — this task is wiring a Server Action to `sessaoAtual()` and `redirect()`, both of which require the Next.js request context and are exercised by Task 14's manual browser verification instead. The underlying business logic (`adicionarAoCarrinho`) is already tested in Task 6.

- [ ] **Step 1: Write the Server Action**

Create `src/app/(public)/events/[slug]/acoes.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { adicionarAoCarrinho } from '@/server/ticketing/application/carrinho';
import { pedidosRepository } from '@/server/ticketing/infrastructure/memoria-pedidos';
import { catalogoPublicoRepository } from '@/server/event/infrastructure/seed-catalogo';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';

const esquema = z.object({
  eventoId: z.string().min(1),
  loteId: z.string().min(1),
  quantidade: z.number().int().min(1).max(8),
});

export interface RespostaDoCarrinho {
  readonly erro?: string;
}

export async function acaoAdicionarAoCarrinho(
  dados: unknown,
): Promise<RespostaDoCarrinho> {
  const analise = esquema.safeParse(dados);
  if (!analise.success) return { erro: 'Escolha inválida de ingresso.' };

  const sessao = await sessaoAtual();
  if (!sessao) {
    redirect(`/login?depois=${encodeURIComponent('/events')}`);
  }

  let pedidoId: string;
  try {
    const pedido = await adicionarAoCarrinho(
      pedidosRepository,
      catalogoPublicoRepository,
      sessao.usuarioId,
      analise.data.eventoId,
      analise.data.loteId,
      analise.data.quantidade,
      new Date(),
    );
    pedidoId = pedido.id;
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }

  redirect(`/checkout/${pedidoId}`);
}
```

- [ ] **Step 2: Wire the Server Action into `SeletorDeIngresso`**

Replace the whole content of `src/components/seletor-de-ingresso.tsx` with:

```tsx
'use client';

import { MinusIcon, PlusIcon } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import type { Evento, Lote } from '@/server/event/domain/evento';
import { loteEstaAberto } from '@/server/event/domain/evento';
import { acaoAdicionarAoCarrinho } from '@/app/(public)/events/[slug]/acoes';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Nenhum pedido único pode levar mais ingressos do que isso, mesmo com estoque de sobra. */
const LIMITE_POR_PEDIDO = 8;

export function SeletorDeIngresso({ evento, agora }: { evento: Evento; agora: Date }) {
  const abertos = evento.lotes.filter((lote) => loteEstaAberto(lote, agora));
  const [escolhido, setEscolhido] = useState<string | null>(abertos[0]?.id ?? null);
  const [quantidade, setQuantidade] = useState(1);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciarTransicao] = useTransition();

  if (abertos.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-bg px-4 py-3.5 text-sm text-fg-muted">
        Não há lotes disponíveis para este evento no momento.
      </p>
    );
  }

  const lote = abertos.find((l) => l.id === escolhido) ?? abertos[0];
  const maximo = Math.min(LIMITE_POR_PEDIDO, lote.vagas - lote.vendidos);

  function escolherLote(l: Lote) {
    setEscolhido(l.id);
    setQuantidade((atual) => Math.min(atual, Math.min(LIMITE_POR_PEDIDO, l.vagas - l.vendidos)));
  }

  function continuar() {
    setErro(null);
    iniciarTransicao(async () => {
      const resposta = await acaoAdicionarAoCarrinho({
        eventoId: evento.id,
        loteId: lote.id,
        quantidade,
      });
      if (resposta?.erro) setErro(resposta.erro);
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2.5" role="radiogroup" aria-label="Tipo de ingresso">
        {abertos.map((l) => (
          <OpcaoDeLote
            key={l.id}
            lote={l}
            selecionado={l.id === lote.id}
            onSelecionar={() => escolherLote(l)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-sm font-medium">Quantidade</span>
        <div className="flex items-center gap-3 rounded-full border border-line bg-bg p-1">
          <button
            type="button"
            onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
            disabled={quantidade <= 1}
            aria-label="Diminuir quantidade"
            className="grid size-7 cursor-pointer place-items-center rounded-full text-fg transition-colors duration-150 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MinusIcon className="size-3.5" aria-hidden="true" />
          </button>
          <span className="w-4 text-center text-sm font-semibold tabular-nums" aria-live="polite">
            {quantidade}
          </span>
          <button
            type="button"
            onClick={() => setQuantidade((q) => Math.min(maximo, q + 1))}
            disabled={quantidade >= maximo}
            aria-label="Aumentar quantidade"
            className="grid size-7 cursor-pointer place-items-center rounded-full text-fg transition-colors duration-150 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PlusIcon className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-fg-muted">Total</p>
          <p className="display text-2xl">
            {lote.precoCentavos === 0
              ? 'Gratuito'
              : moeda.format((lote.precoCentavos * quantidade) / 100)}
          </p>
        </div>
        <Button size="lg" onClick={continuar} disabled={enviando}>
          {enviando ? 'Adicionando…' : 'Continuar'}
        </Button>
      </div>
      {erro ? <p className="-mt-2 text-xs text-red-600">{erro}</p> : null}
    </div>
  );
}

function OpcaoDeLote({
  lote,
  selecionado,
  onSelecionar,
}: {
  lote: Lote;
  selecionado: boolean;
  onSelecionar: () => void;
}) {
  const restam = lote.vagas - lote.vendidos;
  const escasso = restam / lote.vagas <= 0.2;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selecionado}
      onClick={onSelecionar}
      data-ativo={selecionado ? 'true' : undefined}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-bg p-4 text-left transition-colors duration-150 hover:border-line-strong data-[ativo]:border-brand data-[ativo]:bg-brand-tint"
    >
      <span className="grid gap-1">
        <span className="text-sm font-semibold">{lote.nome}</span>
        <span className="text-[13px] text-fg-muted">
          {escasso ? `Últimas ${restam} vagas` : `${restam} vagas disponíveis`}
        </span>
      </span>
      <span className="display text-lg">
        {lote.precoCentavos === 0 ? 'Grátis' : moeda.format(lote.precoCentavos / 100)}
      </span>
    </button>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd ducktix && npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
cd ducktix && git add "src/app/(public)/events/[slug]/acoes.ts" src/components/seletor-de-ingresso.tsx
git commit -m "feat(events): botao adicionar ao carrinho na pagina do evento"
```

---

## Task 11: Página `/checkout/[id]`

**Files:**
- Create: `src/app/(private)/checkout/[id]/acoes.ts`
- Create: `src/app/(private)/checkout/[id]/schemas.ts`
- Create: `src/app/(private)/checkout/[id]/formulario-checkout.tsx`
- Modify: `src/app/(private)/checkout/[id]/page.tsx`

**Interfaces:**
- Consumes: `aplicarCupom`, `confirmarPedido` (Task 7), `pedidosRepository`/`cupomRepository` (Task 4), `memoriaIngressosRepository` (Task 5), `catalogoPublicoRepository` (Task 2), `sessaoAtual`, `Moldura`/`Cabecalho`/`Rodape`/`Faixa` (existing), `usarFormularioDeAcao` pattern (existing, adapted — see below).

- [ ] **Step 1: Write the Zod schema**

Create `src/app/(private)/checkout/[id]/schemas.ts`:

```ts
import { z } from 'zod';

const cpfSomenteDigitos = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length === 11, 'CPF precisa ter 11 dígitos.');

export const esquemaParticipante = z.object({
  nome: z.string().trim().min(2, 'Informe o nome completo.').max(120, 'Nome longo demais.'),
  cpf: cpfSomenteDigitos,
});

export const esquemaConfirmarPedido = z.object({
  participantes: z.array(esquemaParticipante).min(1),
});

export const esquemaAplicarCupom = z.object({
  codigo: z.string().trim().min(1, 'Informe um código de cupom.').max(40),
});

export type DadosConfirmarPedido = z.infer<typeof esquemaConfirmarPedido>;
export type DadosAplicarCupom = z.infer<typeof esquemaAplicarCupom>;
```

- [ ] **Step 2: Write the Server Actions**

Create `src/app/(private)/checkout/[id]/acoes.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { aplicarCupom, confirmarPedido } from '@/server/ticketing/application/checkout';
import { pedidosRepository } from '@/server/ticketing/infrastructure/memoria-pedidos';
import { cupomRepository } from '@/server/ticketing/infrastructure/memoria-cupons';
import { memoriaIngressosRepository } from '@/server/participation/infrastructure/memoria-ingressos';
import { catalogoPublicoRepository } from '@/server/event/infrastructure/seed-catalogo';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { esquemaAplicarCupom, esquemaConfirmarPedido } from './schemas';

export interface RespostaDoCheckout {
  readonly erro?: string;
}

async function exigirSessao() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/login');
  return sessao;
}

export async function acaoAplicarCupom(pedidoId: string, dados: unknown): Promise<RespostaDoCheckout> {
  const analise = esquemaAplicarCupom.safeParse(dados);
  if (!analise.success) return { erro: 'Informe um código de cupom.' };

  const sessao = await exigirSessao();
  try {
    await aplicarCupom(pedidosRepository, cupomRepository, pedidoId, sessao.usuarioId, analise.data.codigo, new Date());
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }
  return {};
}

export async function acaoConfirmarPedido(pedidoId: string, dados: unknown): Promise<RespostaDoCheckout> {
  const analise = esquemaConfirmarPedido.safeParse(dados);
  if (!analise.success) {
    const primeiraMensagem = analise.error.issues[0]?.message ?? 'Dados de participante inválidos.';
    return { erro: primeiraMensagem };
  }

  const sessao = await exigirSessao();
  try {
    await confirmarPedido(
      {
        pedidos: pedidosRepository,
        cupons: cupomRepository,
        ingressos: memoriaIngressosRepository,
        catalogo: catalogoPublicoRepository,
      },
      pedidoId,
      sessao.usuarioId,
      analise.data.participantes,
      new Date(),
    );
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }

  redirect(`/checkout/${pedidoId}/thank-you`);
}
```

- [ ] **Step 3: Add `buscarPorId` to `CupomRepository`**

The checkout page needs to resolve `pedido.cupomId` (an id) back to a `Cupom` to compute the discounted total — `CupomRepository` only exposes lookup by code so far. Add the missing method now, before writing the page.

In `src/server/ticketing/ports/cupons.ts`, add to the interface:

```ts
  buscarPorId(cupomId: string): Promise<Cupom | null>;
```

In `src/server/ticketing/infrastructure/memoria-cupons.ts`, add to the class:

```ts
  async buscarPorId(cupomId: string): Promise<Cupom | null> {
    return this.cupons.find((c) => c.id === cupomId) ?? null;
  }
```

Add a test in `src/server/ticketing/infrastructure/memoria-cupons.test.ts` (append):

```ts
  it('buscarPorId encontra o cupom seed pelo id', async () => {
    const repo = new MemoriaCupomRepository();
    const porCodigo = await repo.buscarPorCodigo('PROMO10');
    await expect(repo.buscarPorId(porCodigo!.id)).resolves.toEqual(porCodigo);
    await expect(repo.buscarPorId('nao-existe')).resolves.toBeNull();
  });
```

Run: `cd ducktix && npx vitest run src/server/ticketing/infrastructure/memoria-cupons.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 4: Write the client form component**

Create `src/app/(private)/checkout/[id]/formulario-checkout.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { acaoAplicarCupom, acaoConfirmarPedido } from './acoes';
import { type DadosConfirmarPedido, esquemaConfirmarPedido } from './schemas';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function FormularioCheckout({
  pedidoId,
  totalDeUnidades,
  totalComDescontoCentavos,
}: {
  pedidoId: string;
  totalDeUnidades: number;
  totalComDescontoCentavos: number;
}) {
  const [codigoCupom, setCodigoCupom] = useState('');
  const [erroCupom, setErroCupom] = useState<string | null>(null);
  const [erroConfirmar, setErroConfirmar] = useState<string | null>(null);
  const [enviandoCupom, iniciarTransicaoCupom] = useTransition();
  const [confirmando, iniciarTransicaoConfirmar] = useTransition();

  const formulario = useForm<DadosConfirmarPedido>({
    resolver: zodResolver(esquemaConfirmarPedido),
    defaultValues: {
      participantes: Array.from({ length: totalDeUnidades }, () => ({ nome: '', cpf: '' })),
    },
  });

  const { fields } = useFieldArray({ control: formulario.control, name: 'participantes' });

  function aplicarCupom() {
    setErroCupom(null);
    iniciarTransicaoCupom(async () => {
      const resposta = await acaoAplicarCupom(pedidoId, { codigo: codigoCupom });
      if (resposta?.erro) setErroCupom(resposta.erro);
    });
  }

  const enviar = formulario.handleSubmit((valores) => {
    setErroConfirmar(null);
    iniciarTransicaoConfirmar(async () => {
      const resposta = await acaoConfirmarPedido(pedidoId, valores);
      if (resposta?.erro) setErroConfirmar(resposta.erro);
    });
  });

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end gap-3 border-t border-line pt-6">
        <div className="flex-1 min-w-[12rem]">
          <label className="text-sm font-medium" htmlFor="codigo-cupom">
            Cupom de desconto
          </label>
          <Input
            id="codigo-cupom"
            value={codigoCupom}
            onChange={(e) => setCodigoCupom(e.target.value)}
            placeholder="PROMO10"
            className="mt-1.5"
          />
        </div>
        <Button type="button" variant="secondary" onClick={aplicarCupom} disabled={enviandoCupom}>
          {enviandoCupom ? 'Aplicando…' : 'Aplicar cupom'}
        </Button>
      </div>
      {erroCupom ? <p className="text-xs text-red-600">{erroCupom}</p> : null}

      <p className="text-sm">
        Total: <span className="font-semibold">{moeda.format(totalComDescontoCentavos / 100)}</span>
      </p>

      <Form {...formulario}>
        <form onSubmit={enviar} noValidate className="grid gap-6">
          {fields.map((field, indice) => (
            <fieldset key={field.id} className="grid gap-3 rounded-lg border border-line p-4">
              <legend className="px-1 text-sm font-semibold">Participante {indice + 1}</legend>
              <FormField
                control={formulario.control}
                name={`participantes.${indice}.nome`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formulario.control}
                name={`participantes.${indice}.cpf`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" placeholder="000.000.000-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>
          ))}

          {erroConfirmar ? <p className="text-sm text-red-600">{erroConfirmar}</p> : null}

          <Button type="submit" size="lg" disabled={confirmando}>
            {confirmando ? 'Confirmando…' : 'Confirmar pedido'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
```

- [ ] **Step 5: Write the page**

Replace `src/app/(private)/checkout/[id]/page.tsx` with:

```tsx
import { notFound, redirect } from 'next/navigation';
import { Cabecalho } from '@/components/cabecalho';
import { Faixa, Filete, Moldura } from '@/components/moldura';
import { Rodape } from '@/components/rodape';
import { pedidosRepository } from '@/server/ticketing/infrastructure/memoria-pedidos';
import { cupomRepository } from '@/server/ticketing/infrastructure/memoria-cupons';
import { catalogoPublicoRepository } from '@/server/event/infrastructure/seed-catalogo';
import { totalComDescontoCentavos, totalDeUnidades } from '@/server/ticketing/domain/pedido';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { FormularioCheckout } from './formulario-checkout';

export const dynamic = 'force-dynamic';

export default async function PaginaDeCheckout({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/login');

  const pedido = await pedidosRepository.buscarPorId(id);
  if (!pedido || pedido.participanteId !== sessao.usuarioId) notFound();
  if (pedido.status !== 'aberto') redirect(`/checkout/${id}/thank-you`);

  const cupom = pedido.cupomId ? await cupomRepository.buscarPorId(pedido.cupomId) : null;

  const itensComEvento = await Promise.all(
    pedido.itens.map(async (item) => {
      const evento = await catalogoPublicoRepository.buscarPorId(item.eventoId);
      const lote = evento?.lotes.find((l) => l.id === item.loteId);
      return { item, eventoNome: evento?.nome ?? 'Evento removido', loteNome: lote?.nome ?? '—' };
    }),
  );

  return (
    <Moldura>
      <Cabecalho />
      <Faixa className="py-14 md:py-20">
        <div className="mx-auto max-w-[42rem]">
          <h1 className="display text-[clamp(1.75rem,3.6vw,2.5rem)]">Finalizar compra</h1>

          <div className="mt-8 grid gap-3">
            {itensComEvento.map(({ item, eventoNome, loteNome }) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-line bg-surface p-4"
              >
                <div>
                  <p className="text-sm font-semibold">{eventoNome}</p>
                  <p className="text-[13px] text-fg-muted">
                    {loteNome} · {item.quantidade}x
                  </p>
                </div>
                <p className="text-sm font-semibold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    (item.quantidade * item.precoUnitarioCentavos) / 100,
                  )}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <FormularioCheckout
              pedidoId={pedido.id}
              totalDeUnidades={totalDeUnidades(pedido)}
              totalComDescontoCentavos={totalComDescontoCentavos(pedido, cupom)}
            />
          </div>
        </div>
      </Faixa>
      <Filete />
      <Rodape />
    </Moldura>
  );
}
```

- [ ] **Step 6: Typecheck and manual smoke test**

Run: `cd ducktix && npx tsc --noEmit && npx vitest run`
Expected: no type errors, all tests still pass.

- [ ] **Step 7: Commit**

```bash
cd ducktix && git add "src/app/(private)/checkout" src/server/ticketing/ports/cupons.ts src/server/ticketing/infrastructure/memoria-cupons.ts src/server/ticketing/infrastructure/memoria-cupons.test.ts
git commit -m "feat(checkout): pagina de checkout com cupom e dados de participante"
```

---

## Task 12: Página `/checkout/[id]/thank-you`

**Files:**
- Modify: `src/app/(private)/checkout/[id]/thank-you/page.tsx`

**Interfaces:**
- Consumes: `pedidosRepository` (Task 4), `memoriaIngressosRepository` (Task 5), `catalogoPublicoRepository` (Task 2), `sessaoAtual`.

- [ ] **Step 1: Write the page**

Replace `src/app/(private)/checkout/[id]/thank-you/page.tsx` with:

```tsx
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Cabecalho } from '@/components/cabecalho';
import { Faixa, Filete, Moldura } from '@/components/moldura';
import { Rodape } from '@/components/rodape';
import { Button } from '@/components/ui/button';
import { pedidosRepository } from '@/server/ticketing/infrastructure/memoria-pedidos';
import { memoriaIngressosRepository } from '@/server/participation/infrastructure/memoria-ingressos';
import { catalogoPublicoRepository } from '@/server/event/infrastructure/seed-catalogo';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';

export const dynamic = 'force-dynamic';

export default async function PaginaDeAgradecimento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/login');

  const pedido = await pedidosRepository.buscarPorId(id);
  if (!pedido || pedido.participanteId !== sessao.usuarioId) notFound();
  if (pedido.status !== 'confirmado') redirect(`/checkout/${id}`);

  const itemIds = pedido.itens.map((item) => item.id);
  const ingressos = await memoriaIngressosRepository.listarPorItensDePedido(itemIds);

  const ingressosComEvento = await Promise.all(
    ingressos.map(async (ingresso) => {
      const evento = await catalogoPublicoRepository.buscarPorId(ingresso.eventoId);
      return { ingresso, eventoNome: evento?.nome ?? 'Evento removido' };
    }),
  );

  return (
    <Moldura>
      <Cabecalho />
      <Faixa className="py-16 md:py-24">
        <div className="mx-auto max-w-[42rem] text-center">
          <h1 className="display text-[clamp(1.75rem,3.6vw,2.5rem)]">Pedido confirmado</h1>
          <p className="mx-auto mt-3 max-w-[52ch] text-[15px] text-fg-muted">
            {ingressosComEvento.length} ingresso(s) emitido(s). Você já pode acompanhá-los em
            "Meus ingressos".
          </p>

          <div className="mx-auto mt-8 grid max-w-[32rem] gap-3 text-left">
            {ingressosComEvento.map(({ ingresso, eventoNome }) => (
              <div
                key={ingresso.id}
                className="rounded-lg border border-line bg-surface p-4 text-sm"
              >
                <p className="font-semibold">{eventoNome}</p>
                <p className="text-[13px] text-fg-muted">{ingresso.participanteNome}</p>
              </div>
            ))}
          </div>

          <Button asChild size="lg" className="mt-8">
            <Link href="/my-tickets">Ver meus ingressos</Link>
          </Button>
        </div>
      </Faixa>
      <Filete />
      <Rodape />
    </Moldura>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd ducktix && npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
cd ducktix && git add "src/app/(private)/checkout/[id]/thank-you"
git commit -m "feat(checkout): pagina de agradecimento com ingressos emitidos"
```

---

## Task 13: Página `/my-tickets`

**Files:**
- Modify: `src/app/(private)/my-tickets/page.tsx`

**Interfaces:**
- Consumes: `listarIngressosDoParticipante` (Task 8), `pedidosRepository`, `memoriaIngressosRepository`, `catalogoPublicoRepository`, `sessaoAtual`.

- [ ] **Step 1: Write the page**

Replace `src/app/(private)/my-tickets/page.tsx` with:

```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Cabecalho } from '@/components/cabecalho';
import { Faixa, Filete, Moldura } from '@/components/moldura';
import { Rodape } from '@/components/rodape';
import { Button } from '@/components/ui/button';
import { listarIngressosDoParticipante } from '@/server/participation/application/meus-ingressos';
import { pedidosRepository } from '@/server/ticketing/infrastructure/memoria-pedidos';
import { memoriaIngressosRepository } from '@/server/participation/infrastructure/memoria-ingressos';
import { catalogoPublicoRepository } from '@/server/event/infrastructure/seed-catalogo';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';

export const dynamic = 'force-dynamic';

const ROTULO_STATUS: Record<string, string> = {
  emitido: 'Emitido',
  utilizado: 'Utilizado',
  cancelado: 'Cancelado',
};

export default async function PaginaDeIngressos() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/login');

  const resultado = await listarIngressosDoParticipante(
    pedidosRepository,
    memoriaIngressosRepository,
    sessao.usuarioId,
  );

  const comEvento = await Promise.all(
    resultado.map(async ({ ingresso, eventoId }) => {
      const evento = await catalogoPublicoRepository.buscarPorId(eventoId);
      return { ingresso, eventoNome: evento?.nome ?? 'Evento removido' };
    }),
  );

  return (
    <Moldura>
      <Cabecalho />
      <Faixa className="py-14 md:py-20">
        <div className="mx-auto max-w-[48rem]">
          <h1 className="display text-[clamp(1.75rem,3.6vw,2.5rem)]">Meus ingressos</h1>

          {comEvento.length === 0 ? (
            <div className="mt-8 rounded-lg border border-line bg-surface p-8 text-center">
              <p className="text-sm text-fg-muted">Você ainda não tem nenhum ingresso.</p>
              <Button asChild className="mt-4">
                <Link href="/events">Ver eventos</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-8 grid gap-3">
              {comEvento.map(({ ingresso, eventoNome }) => (
                <div
                  key={ingresso.id}
                  className="flex items-center justify-between rounded-lg border border-line bg-surface p-4"
                >
                  <div>
                    <p className="text-sm font-semibold">{eventoNome}</p>
                    <p className="text-[13px] text-fg-muted">{ingresso.participanteNome}</p>
                  </div>
                  <span className="text-xs font-medium text-fg-muted">
                    {ROTULO_STATUS[ingresso.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Faixa>
      <Filete />
      <Rodape />
    </Moldura>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd ducktix && npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
cd ducktix && git add "src/app/(private)/my-tickets"
git commit -m "feat(my-tickets): listar ingressos do participante logado"
```

---

## Task 14: Página `/account`

**Files:**
- Create: `src/app/(private)/account/schemas.ts`
- Create: `src/app/(private)/account/acoes.ts`
- Create: `src/app/(private)/account/formulario-nome.tsx`
- Create: `src/app/(private)/account/formulario-senha.tsx`
- Modify: `src/app/(private)/account/page.tsx`

**Interfaces:**
- Consumes: `atualizarNome`, `alterarSenha` (Task 9), `usuariosRepository` (existing), `sessaoAtual` (existing), `rotuloPapel` (existing).

- [ ] **Step 1: Write the Zod schemas**

Create `src/app/(private)/account/schemas.ts`:

```ts
import { z } from 'zod';

export const esquemaNome = z.object({
  nome: z.string().trim().min(2, 'Informe o seu nome.').max(120, 'Nome longo demais.'),
});

const senha = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres.')
  .max(200, 'Senha longa demais.');

export const esquemaSenha = z
  .object({
    senhaAtual: z.string().min(1, 'Informe a senha atual.'),
    novaSenha: senha,
    confirmacao: z.string(),
  })
  .refine((valores) => valores.novaSenha === valores.confirmacao, {
    message: 'As senhas não conferem.',
    path: ['confirmacao'],
  });

export type DadosNome = z.infer<typeof esquemaNome>;
export type DadosSenha = z.infer<typeof esquemaSenha>;
```

- [ ] **Step 2: Write the Server Actions**

Create `src/app/(private)/account/acoes.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { alterarSenha } from '@/server/identity/application/alterar-senha';
import { atualizarNome } from '@/server/identity/application/atualizar-perfil';
import { CredenciaisInvalidasError, DadosDeEntradaInvalidosError } from '@/server/identity/domain/erros';
import { usuariosRepository } from '@/server/identity/infrastructure/memoria-usuarios';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { esquemaNome, esquemaSenha } from './schemas';

export interface RespostaDaConta {
  readonly erro?: string;
  readonly sucesso?: boolean;
}

async function exigirSessao() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/login');
  return sessao;
}

export async function acaoAtualizarNome(dados: unknown): Promise<RespostaDaConta> {
  const analise = esquemaNome.safeParse(dados);
  if (!analise.success) return { erro: analise.error.issues[0]?.message ?? 'Nome inválido.' };

  const sessao = await exigirSessao();
  try {
    await atualizarNome(usuariosRepository, sessao.usuarioId, analise.data.nome);
  } catch (erro) {
    if (erro instanceof DadosDeEntradaInvalidosError) return { erro: erro.message };
    throw erro;
  }
  return { sucesso: true };
}

export async function acaoAlterarSenha(dados: unknown): Promise<RespostaDaConta> {
  const analise = esquemaSenha.safeParse(dados);
  if (!analise.success) return { erro: analise.error.issues[0]?.message ?? 'Dados inválidos.' };

  const sessao = await exigirSessao();
  try {
    await alterarSenha(usuariosRepository, sessao.usuarioId, analise.data.senhaAtual, analise.data.novaSenha);
  } catch (erro) {
    if (erro instanceof CredenciaisInvalidasError) return { erro: erro.message };
    if (erro instanceof DadosDeEntradaInvalidosError) return { erro: erro.message };
    throw erro;
  }
  return { sucesso: true };
}
```

- [ ] **Step 3: Write the form components**

Create `src/app/(private)/account/formulario-nome.tsx`:

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { acaoAtualizarNome } from './acoes';
import { type DadosNome, esquemaNome } from './schemas';

export function FormularioNome({ nomeAtual }: { nomeAtual: string }) {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, iniciarTransicao] = useTransition();

  const formulario = useForm<DadosNome>({
    resolver: zodResolver(esquemaNome),
    defaultValues: { nome: nomeAtual },
  });

  const enviar = formulario.handleSubmit((valores) => {
    setMensagem(null);
    iniciarTransicao(async () => {
      const resposta = await acaoAtualizarNome(valores);
      if (resposta?.erro) {
        formulario.setError('root', { message: resposta.erro });
      } else {
        setMensagem('Nome atualizado.');
      }
    });
  });

  return (
    <Form {...formulario}>
      <form onSubmit={enviar} noValidate className="grid gap-4">
        <FormField
          control={formulario.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {formulario.formState.errors.root ? (
          <p className="text-sm text-red-600">{formulario.formState.errors.root.message}</p>
        ) : null}
        {mensagem ? <p className="text-sm text-green-700">{mensagem}</p> : null}
        <Button type="submit" disabled={enviando} className="w-fit">
          {enviando ? 'Salvando…' : 'Salvar nome'}
        </Button>
      </form>
    </Form>
  );
}
```

Create `src/app/(private)/account/formulario-senha.tsx`:

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { CampoDeSenha } from '@/components/campo-de-senha';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { acaoAlterarSenha } from './acoes';
import { type DadosSenha, esquemaSenha } from './schemas';

export function FormularioSenha() {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, iniciarTransicao] = useTransition();

  const formulario = useForm<DadosSenha>({
    resolver: zodResolver(esquemaSenha),
    defaultValues: { senhaAtual: '', novaSenha: '', confirmacao: '' },
  });

  const enviar = formulario.handleSubmit((valores) => {
    setMensagem(null);
    iniciarTransicao(async () => {
      const resposta = await acaoAlterarSenha(valores);
      if (resposta?.erro) {
        formulario.setError('root', { message: resposta.erro });
      } else {
        setMensagem('Senha alterada.');
        formulario.reset({ senhaAtual: '', novaSenha: '', confirmacao: '' });
      }
    });
  });

  return (
    <Form {...formulario}>
      <form onSubmit={enviar} noValidate className="grid gap-4">
        <FormField
          control={formulario.control}
          name="senhaAtual"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha atual</FormLabel>
              <FormControl>
                <CampoDeSenha autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formulario.control}
          name="novaSenha"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nova senha</FormLabel>
              <FormControl>
                <CampoDeSenha autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formulario.control}
          name="confirmacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar nova senha</FormLabel>
              <FormControl>
                <CampoDeSenha autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {formulario.formState.errors.root ? (
          <p className="text-sm text-red-600">{formulario.formState.errors.root.message}</p>
        ) : null}
        {mensagem ? <p className="text-sm text-green-700">{mensagem}</p> : null}
        <Button type="submit" disabled={enviando} className="w-fit">
          {enviando ? 'Salvando…' : 'Alterar senha'}
        </Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 4: Write the page**

Replace `src/app/(private)/account/page.tsx` with:

```tsx
import { redirect } from 'next/navigation';
import { Cabecalho } from '@/components/cabecalho';
import { Faixa, Filete, Moldura } from '@/components/moldura';
import { Rodape } from '@/components/rodape';
import { rotuloPapel } from '@/server/identity/domain/usuario';
import { usuariosRepository } from '@/server/identity/infrastructure/memoria-usuarios';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { FormularioNome } from './formulario-nome';
import { FormularioSenha } from './formulario-senha';

export const dynamic = 'force-dynamic';

export default async function PaginaDeConta() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/login');

  const usuario = await usuariosRepository.buscarPorId(sessao.usuarioId);
  if (!usuario) redirect('/login');

  return (
    <Moldura>
      <Cabecalho />
      <Faixa className="py-14 md:py-20">
        <div className="mx-auto max-w-[36rem]">
          <h1 className="display text-[clamp(1.75rem,3.6vw,2.5rem)]">Minha conta</h1>
          <p className="mt-2 text-sm text-fg-muted">
            {usuario.email} · {rotuloPapel(usuario.papel)}
          </p>

          <div className="mt-8 grid gap-8">
            <section className="rounded-lg border border-line bg-surface p-6">
              <h2 className="text-sm font-semibold">Nome</h2>
              <div className="mt-4">
                <FormularioNome nomeAtual={usuario.nome} />
              </div>
            </section>

            <section className="rounded-lg border border-line bg-surface p-6">
              <h2 className="text-sm font-semibold">Senha</h2>
              <div className="mt-4">
                <FormularioSenha />
              </div>
            </section>
          </div>
        </div>
      </Faixa>
      <Filete />
      <Rodape />
    </Moldura>
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `cd ducktix && npx tsc --noEmit`
Expected: no type errors. If `CampoDeSenha` doesn't accept a plain `ref`/`{...field}` spread the same way `Input` does, check `src/components/campo-de-senha.tsx` — it's already used identically in `formulario-register.tsx` (Task context, see spec), so the same usage pattern applies here.

- [ ] **Step 6: Commit**

```bash
cd ducktix && git add "src/app/(private)/account"
git commit -m "feat(account): editar nome e trocar senha"
```

---

## Task 15: Verificação manual de ponta a ponta

**Files:** none (verification only).

- [ ] **Step 1: Full automated check**

Run: `cd ducktix && npx vitest run && npx tsc --noEmit && npx next build`
Expected: all tests PASS, no type errors, build succeeds with all routes listed (including `/account`, `/checkout/[id]`, `/checkout/[id]/thank-you`, `/my-tickets`).

- [ ] **Step 2: Manual browser walkthrough**

Start the dev server (`npm run dev` inside `ducktix/`) and, logged in as a participante:
1. Open an event page (`/events/<slug>`), pick a lote and quantity, click "Continuar" — should land on `/checkout/<id>`.
2. On checkout, apply coupon `PROMO10` — total should drop by 10%.
3. Fill in name+CPF for every participant field shown, click "Confirmar pedido" — should redirect to `/checkout/<id>/thank-you` listing the issued tickets.
4. Click "Ver meus ingressos" — `/my-tickets` should list the same tickets.
5. Go to `/account`, change the name, then change the password (with the correct current password) — both should show success messages; log out and log back in with the new password to confirm it took effect.
6. Attempt `/checkout/<id>` for a pedido that isn't the logged-in user's (or a nonexistent id) — should 404, not crash.

- [ ] **Step 3: Report results**

If any step fails, file it as a fix before considering Fase 1 done — do not silently patch without noting it in the commit message.

---

## Self-Review Notes (already applied above)

- **Spec coverage:** every numbered decision in the spec (carrinho = pedido aberto, multi-item, mock payment, cupom, nome+CPF per unit, my-tickets by pedido owner, account edit) has a corresponding task. `Lote.id` and the `event` port additions are covered in Task 2. Organizer pages are explicitly out of scope and untouched.
- **Type consistency:** `Pedido`/`ItemPedido`/`Cupom` (Task 3) are consumed with the same field names throughout Tasks 4–14 (`precoUnitarioCentavos`, `cupomId`, `itens`, `loteId`, `eventoId`). `Ingresso` fields (`participanteNome`, `participanteCpf`, `itemPedidoId`) match between Task 5's definition and every later consumer.
- **Fixed during review:** the checkout page needs to resolve `pedido.cupomId` (an id) back to a `Cupom`, but `CupomRepository` only exposed lookup by code — added `buscarPorId` to the port and its in-memory implementation as Task 11 Step 3, before the page is written, instead of shipping a workaround in the page itself.
