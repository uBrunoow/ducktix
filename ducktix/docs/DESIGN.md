---
title: Design System
tags:
  - ducktix
  - design
  - frontend
aliases:
  - Design
  - Identidade Visual
updated: 2026-09-02
---

# Design System — Ducktix

> [!abstract] Propósito
> Definir a identidade visual do Ducktix: paleta, tipografia, grid e componentes-base. Referência obrigatória para qualquer tela em [[frontend/manifesto]].

> [!warning] Este documento substitui a versão anterior
> A versão de 2026-08-27 descrevia um mundo **tech/mono/quadrado/escuro** que foi **descartado por decisão explícita do usuário antes da implementação** — nunca chegou a ser construído. O que existe no código (`src/app/layout.tsx`, `src/app/globals.css`) é um mundo diferente: canvas quente, tipografia Onest/Inter Tight, tudo em pill, um único acento amarelo em dois papéis. Este documento descreve **esse** mundo — a autoridade visual é o código, este arquivo só o registra por escrito.

## Conceito

Ducktix é uma plataforma de eventos com a gramática de um produto de infraestrutura: densa em dado, calma, com moldura editorial. Recusa o herói fotográfico full-bleed comum da categoria — a marca vem da **moldura** (filetes verticais + gutters hachurados), não de fotografia.

> [!important] Regra de cor
> Só existem três cores de verdade: o canvas quente, preto/cinza para texto e um único acento amarelo `#FFD400`. O amarelo tem **dois papéis que nunca se trocam**: preenche (`--brand`, texto sempre preto por cima) ou é tinta de texto (`--brand-ink`, um tom mais escuro para manter contraste). Nunca introduzir uma segunda cor de acento.

## Tema único (claro)

Não existe tema escuro. Todos os tokens vivem em `:root` de `src/app/globals.css`.

### Tokens

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#EFF1E7` | Canvas da página — quente, não branco puro |
| `--surface` | `#FFFFFF` | Cards, painéis |
| `--surface-2` | `#E7E9DE` | Hover, inputs |
| `--line` | `#DFE1D6` | Bordas, filetes hairline |
| `--line-strong` | `#C9CCBC` | Borda em hover |
| `--fg` | `#26262B` | Texto principal |
| `--fg-muted` | `#6B6B73` | Texto secundário |
| `--brand` | `#FFD400` | Preenchimento — CTA, chip ativo (texto sempre `--brand-fg`, preto) |
| `--brand-fg` | `#0A0A0A` | Texto sobre `--brand` |
| `--brand-ink` | `#7A5C00` | Amarelo como tinta de texto — headline bicolor, links, anel de foco (6.9:1 de contraste; `--brand` puro sobre o canvas reprova) |
| `--brand-tint` | `#FFF6CC` | Fundo suave de estado ativo (chip/opção selecionada) |
| `--danger` / `--danger-tint` | `#C0392B` / `#FBEAE7` | Único delta negativo — não é acento, é semântico |

> [!note] `--brand` e `--brand-ink` não são intercambiáveis
> `--brand` (`#FFD400`) só entra como **fundo preenchido**. Como cor de texto sobre o canvas ele dá 1.3:1 de contraste e reprova qualquer critério — por isso título bicolor, links e foco usam `--brand-ink`.

## Tipografia

- **Onest** (`--font-display`), peso 600, `tracking: -0.05em`: títulos, headings, chips de rótulo. Classe utilitária `.display`.
- **Inter Tight** (`--font-sans`): todo o resto — corpo, labels de formulário, navegação, botões.
- Nunca serifada, nunca mono para título grande — a versão anterior deste documento pedia mono; **não usar**.

## Grid e forma

- **Tudo é pill.** `border-radius: 9999px` em botões, chips e badges (`--r-pill`). Cards usam `--r-card` = `1rem` (não zero, não quadrado).
- **Moldura**: coluna central com filetes verticais full-bleed (`Moldura` em `src/components/moldura.tsx`) e gutters hachurados a 45° (`.hatch`) — é a assinatura reconhecível sem conteúdo, substitui o "grid bento" da versão anterior.
- Bordas finas de 1px (`--line`), sombra sutil só em cards (`--shadow-card`), nunca glassmorphism/blur pesado.
- Header é uma pill flutuante (`Cabecalho`), não uma barra full-width com borda inferior.

## Componentes-base

Os componentes reais vivem em `src/components/ui/*` (shadcn, estilo `new-york`, tokens remapeados — ver `globals.css`, seção `@theme inline`) e `src/components/*` (composições do produto: `Moldura`, `Cabecalho`, `Rodape`, `CardEvento`, `SeloStatus`, `LoadingButton`).

### Botão primário (CTA)
`variant="default"` do componente `Button`: fundo `--brand`, texto `--brand-fg`, `rounded-full`, hover escurece o amarelo (`#E8C200`) — nunca troca de cor.

### Botão secundário / outline
Fundo transparente ou `--surface-2`, borda 1px, mesmo formato pill.

### Ação assíncrona
Toda Server Action é disparada por `LoadingButton` (`@/components/ui/loading-button`) — nunca um `Button` desabilitado manualmente — e termina em `toast` (sonner) de sucesso ou erro.

### Badge / chip
`Badge`/`Rotulo`: texto pequeno, `rounded-chip` (`1.9rem`), fundo `--surface-2` ou `--brand-tint` quando ativo, borda 1px.

### Card
Borda 1px `--line`, `rounded-card` (`1rem`), `shadow-card`, fundo `--surface` sobre o canvas `--bg`. Título em Onest (`.display`), metadados em Inter Tight com `--fg-muted`.

### Formulário
Zod + react-hook-form sempre (`@/components/ui/form`). Campo de senha usa `CampoDeSenha` (toggle de visibilidade embutido). Upload de imagem usa `react-dropzone` + preview, nunca só um `<input type="file">` cru. Texto rico usa `EditorDeTexto` (Tiptap) — nunca um `<textarea>` para conteúdo que vai virar HTML exibido.

## Imagens

- Sem fotografia de estoque nesta fase: capas de evento são arte gerada em código (`PainelArte`, padrão geométrico determinístico pelo slug). Quando o organizador envia um banner de verdade (`imagemUrl`, URL pública do Vercel Blob), ele substitui a arte gerada.
- Ícones: `lucide-react`, traço fino, monocromáticos (`--fg` ou `--brand-ink`).

## O que evitar

> [!danger] Não fazer
> - Segunda cor de acento.
> - Cantos retos / `border-radius` pequeno em botão ou chip — o sistema é pill, não quadrado.
> - Tipografia mono para título.
> - Tema escuro (não existe).
> - `--brand` como cor de texto direto sobre o canvas (usar `--brand-ink`).
> - Formulário sem zod+react-hook-form, ação de envio sem `LoadingButton`+toast.

## Relação com outros documentos

Este documento define a linguagem visual real; a implementação de componentes React/Tailwind fica em `src/components/`. `docs/frontend/manifesto.md`, `docs/manifesto.md` e `docs/funcionalidades.md` ainda podem conter referências ao mundo antigo (Go/API separada, mono/quadrado) — ver aviso de legado em `PRODUCT.md`. Convenções de código gerais em [[guidelines]].
