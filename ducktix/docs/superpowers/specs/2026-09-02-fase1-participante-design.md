---
title: Fase 1 — Fluxo do Participante (account, checkout, my-tickets)
tags:
  - ducktix
  - spec
  - ticketing
  - participation
updated: 2026-09-02
---

# Fase 1 — Fluxo do Participante

> [!abstract] Propósito
> Substituir os placeholders `EmConstrucao` de `/account`, `/my-tickets`,
> `/checkout/[id]` e `/checkout/[id]/thank-you` por implementação real,
> introduzindo os bounded contexts **Ticketing** e **Participation** que hoje
> não existem no código (só `identity` e `event`). As páginas de organizer
> ficam de fora desta fase — continuam como placeholder.

## Contexto

- Domínio já documentado em `docs/backend/entidades.md` e `docs/glossario.md`
  (Ticketing, Participation). Este spec adapta esse modelo ao estado atual do
  código, que ainda não tem `ticket_batches`/`ticket_types` separados — o
  `Evento.Lote` (`src/server/event/domain/evento.ts`) já é a unidade vendável
  (nome + preço + vagas), então esta fase reaproveita `Lote` no lugar de
  `TicketType`, sem introduzir a tabela `ticket_batches`.
- Persistência: em memória, mesmo padrão de
  `src/server/identity/infrastructure/memoria-usuarios.ts` (classe + Map +
  singleton em `globalThis`). Troca futura por Drizzle não deve tocar domínio
  nem aplicação.
- Autenticação: `sessaoAtual()` já existe (`src/server/identity/infrastructure/sessao.ts`).
  Todas as páginas desta fase exigem sessão (grupo `(private)`).

## Decisões de escopo (fechadas nesta rodada)

1. **Carrinho não é uma entidade própria.** É o `Pedido` do participante com
   `status: 'aberto'` — um por participante por vez. "Adicionar ao carrinho"
   cria esse pedido se não existir, ou incrementa/adiciona item nele.
2. **Pedido pode ter itens de eventos diferentes** (carrinho multi-item,
   multi-evento).
3. **Pagamento é mock instantâneo** — não há seleção de método nem tela de
   "processando"; confirmar o pedido já marca `Pagamento` como aprovado e
   emite os ingressos na mesma operação.
4. **Cupom entra nesta fase** — campo de código no checkout, recalcula total.
5. **Todo ingresso emitido carrega nome completo + CPF de quem vai usá-lo**,
   coletados um formulário por unidade no checkout (não por item — uma
   quantidade 3 gera 3 formulários), mesmo em pedidos de 1 unidade. Isso
   permite comprar para terceiros: o comprador (usuário logado) não precisa
   ser o participante do ingresso.
6. **`/my-tickets` lista por dono do pedido** (usuário logado), não por nome
   no ingresso — um usuário vê todos os ingressos que ele comprou, inclusive
   os emitidos para terceiros.
7. **`/account` permite editar nome e trocar senha** (senha atual + nova),
   reaproveitando as regras de senha de `identity` (`senhaForteOsuficiente`,
   hashing existente).
8. **`Lote` ganha um campo `id`** — hoje não tem, e `ItemPedido` precisa
   referenciar um lote específico de forma estável.

## Bounded contexts novos

### `src/server/ticketing/`

```
domain/pedido.ts       — Pedido, ItemPedido, status, cálculo de total/desconto
domain/cupom.ts        — Cupom, validação de vigência/limite de uso
ports/pedidos.ts        — PedidosRepository
ports/cupons.ts         — CupomRepository
infrastructure/memoria-pedidos.ts
infrastructure/memoria-cupons.ts
application/carrinho.ts       — adicionarAoCarrinho(participanteId, eventoId, loteId, quantidade)
application/checkout.ts       — aplicarCupom(pedidoId, codigo), confirmarPedido(pedidoId, dadosParticipantes[])
```

Entidades:

```ts
type StatusPedido = 'aberto' | 'confirmado' | 'cancelado';

interface ItemPedido {
  readonly id: string;
  readonly eventoId: string;
  readonly loteId: string;
  readonly quantidade: number;
  readonly precoUnitarioCentavos: number; // congelado na adição
}

interface Pedido {
  readonly id: string;
  readonly participanteId: string;
  readonly cupomId: string | null;
  readonly status: StatusPedido;
  readonly itens: readonly ItemPedido[];
  readonly criadoEm: Date;
}

type TipoDesconto = 'percentual' | 'fixo';

interface Cupom {
  readonly id: string;
  readonly codigo: string;
  readonly tipoDesconto: TipoDesconto;
  readonly valor: number; // percentual (0-100) ou centavos, conforme tipo
  readonly validoDe: Date;
  readonly validoAte: Date;
  readonly limiteDeUso: number;
  readonly usos: number;
}
```

Funções de domínio puras: `totalBrutoCentavos(pedido)`,
`cupomValido(cupom, agora)`, `totalComDescontoCentavos(pedido, cupom | null)`,
`totalDeUnidades(pedido)` (soma das quantidades — define quantos formulários
de participante o checkout precisa).

`Pagamento` é modelado como parte da aplicação `confirmarPedido` (registro
simples anexado ao pedido confirmado: método fixo `'mock'`, status
`'aprovado'`, `pagoEm`), sem repositório próprio nesta fase — YAGNI até existir
mais de um método real.

### `src/server/participation/`

```
domain/ingresso.ts      — Ingresso, status
ports/ingressos.ts       — IngressosRepository
infrastructure/memoria-ingressos.ts
application/emitir-ingressos.ts  — chamado por confirmarPedido
application/meus-ingressos.ts    — listarPorParticipante(participanteId)
```

```ts
type StatusIngresso = 'emitido' | 'cancelado' | 'utilizado';

interface Ingresso {
  readonly id: string;
  readonly itemPedidoId: string;
  readonly eventoId: string;
  readonly participanteNome: string;
  readonly participanteCpf: string;
  readonly status: StatusIngresso;
  readonly emitidoEm: Date;
}
```

CPF validado só em formato (11 dígitos, com ou sem máscara) — sem checagem de
dígito verificador nesta fase (fora de escopo, não é o foco de nota).

## Ajuste em `event`

`Lote` (em `src/server/event/domain/evento.ts`) ganha `readonly id: string`.
`SeedCatalogoPublico` (`src/server/event/infrastructure/seed-catalogo.ts`)
passa a gerar/atribuir esse id nos lotes de seed. Toda leitura de lote para
exibição (`loteVigente`, etc.) não muda de assinatura.

Também precisa de uma forma de **decrementar vagas vendidas** e **buscar
lote por id** a partir do `ticketing`. Como `event` não deve depender de
`ticketing` nem vice-versa em domínio, isso é feito via uma nova operação em
`application/painel-organizador.ts` ou um novo `application/vendas.ts` em
`event` — `registrarVenda(eventoId, loteId, quantidade)` — chamada pela
aplicação de `ticketing.confirmarPedido` (dependência de aplicação para
aplicação é aceitável; domínio continua isolado).

## Páginas

### `(public)/events/[slug]/page.tsx` (edição, não nova rota)
Adiciona: seletor de lote (entre os `loteEstaAberto`), input de quantidade,
botão "Adicionar ao carrinho" → Server Action `adicionarAoCarrinho` →
redireciona para `/checkout/[pedidoId]`. Se não houver sessão, redireciona
para `/login` primeiro (sem alterar `sessaoAtual`/auth actions existentes).

### `(private)/checkout/[id]/page.tsx`
- Carrega o pedido por id; 404/redirect se não pertence ao usuário logado ou
  não está `aberto`.
- Lista itens (nome do evento, lote, quantidade, preço).
- Campo de cupom + total recalculado (Server Action `aplicarCupom`).
- N formulários de participante (nome + CPF), N = soma das quantidades.
- Botão "Confirmar pedido" → Server Action `confirmarPedido(pedidoId, dadosParticipantes)`:
  valida todos os campos, emite ingressos, marca pedido confirmado, decrementa
  vagas, redireciona para thank-you.

### `(private)/checkout/[id]/thank-you/page.tsx`
Busca pedido confirmado + ingressos emitidos; se pedido não está confirmado,
redireciona de volta pro checkout. Lista ingressos com nome do evento e nome
do participante; link para `/my-tickets`.

### `(private)/my-tickets/page.tsx`
Lista ingressos cujos itens de pedido pertencem a pedidos do usuário logado
(`participanteId` do pedido, não do ingresso), agrupados por evento, com
status.

### `(private)/account/page.tsx`
- Mostra nome, e-mail, papel (`rotuloPapel`).
- Form 1: editar nome → nova Server Action `identity/application/atualizar-perfil.ts`.
- Form 2: trocar senha (atual + nova) → nova Server Action
  `identity/application/alterar-senha.ts`, valida senha atual via hash
  existente antes de trocar.

## Erros e estados vazios

- Checkout com pedido inexistente/de outro usuário/já confirmado: redirect
  com mensagem (não crash).
- Cupom inválido/expirado/esgotado: mensagem inline, total não muda.
- `/my-tickets` sem ingressos: estado vazio com CTA para `/events`.
- Confirmar pedido com formulário de participante incompleto: erro de
  validação inline (Zod), sem submeter.

## Fora de escopo desta fase

- Cancelamento de pedido/ingresso.
- Métodos de pagamento reais ou simulação de gateway.
- `ticket_batches`/`ticket_types` como entidades separadas de `Lote`.
- Páginas de organizer (ficam com o placeholder atual).
- Persistência em Postgres/Drizzle.
