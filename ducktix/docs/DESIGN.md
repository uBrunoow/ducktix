---
title: Design System
tags:
  - ducktix
  - design
  - frontend
aliases:
  - Design
  - Identidade Visual
updated: 2026-08-27
---

# Design System — Ducktix

> [!abstract] Propósito
> Definir a identidade visual do Ducktix: paleta, tipografia, grid e componentes-base. Referência obrigatória para qualquer tela em [[frontend/manifesto]]. Inspiração visual em `design/` (moodboards genéricos — a paleta de cor deles **não** se aplica, ver abaixo).

## Conceito

Ducktix é um evento de patos. A identidade é **tech / editorial / quadrada**: fontes monoespaçadas, grid rígido, cantos retos (sem `border-radius` grande), bastante espaço negativo e um único acento de cor.

> [!important] Regra de cor
> Só existem três cores de verdade: **preto**, **branco** e **amarelo**. Amarelo é o único acento — usar com moderação (CTA primário, destaques, foco, ícone de marca). Nunca introduzir uma segunda cor de acento (sem verde, sem azul, sem gradientes coloridos).

Referências (`design/*.png`) mostram o *estilo* a copiar — grid modular tipo bento, badges em mono, cards quadrados, fotos em duotone, textura de pontos/pixels — não a paleta (elas usam verde neon; nós usamos amarelo).

## Temas

O site tem **tema escuro** (padrão) e **tema claro**, ambos preto/branco/amarelo com os papéis invertidos.

### Tokens

| Token | Dark | Light | Uso |
|---|---|---|---|
| `--bg` | `#0A0A0A` | `#FFFFFF` | Fundo da página |
| `--surface` | `#141414` | `#F5F5F0` | Cards, painéis |
| `--surface-2` | `#1F1F1F` | `#EAEAE3` | Hover de card, inputs |
| `--border` | `#2E2E2E` | `#111111` | Bordas, divisores (1px, sempre sólida) |
| `--fg` | `#FFFFFF` | `#0A0A0A` | Texto principal |
| `--fg-muted` | `#A3A3A3` | `#4A4A4A` | Texto secundário |
| `--accent` | `#FFD400` | `#FFD400` | CTA, foco, destaque, links |
| `--accent-fg` | `#0A0A0A` | `#0A0A0A` | Texto sobre fundo `--accent` (sempre preto) |

> [!note] Amarelo fixo
> `--accent` não muda entre temas — é a única constante entre os dois modos, junto com `--accent-fg` (texto sobre amarelo é **sempre preto**, nunca branco, por contraste).

Preferir `prefers-color-scheme` com toggle manual persistido (ex.: `localStorage`), aplicando `data-theme="dark|light"` na raiz — mesmo padrão de tokens usado em qualquer Artifact deste projeto.

## Tipografia

- **Mono** (títulos, labels, badges, números, navegação): `JetBrains Mono` ou `IBM Plex Mono`, peso 500–700. Caixa alta em labels curtos (`GET A DEMO`, `LOTE 1`), tracking levemente aberto (`letter-spacing: 0.02em`).
- **Sans** (parágrafos longos, descrições): `Inter` ou `IBM Plex Sans`, peso 400–500. Nunca em títulos grandes — títulos são sempre mono.
- Hierarquia por **tamanho + peso**, não por cor. Títulos grandes em mono bold, corpo em sans regular, `--fg-muted` para texto de apoio.

## Grid e forma

- Grid modular tipo *bento*: seções compostas por blocos quadrados/retangulares de proporções simples (1:1, 4:3, 16:9), como nos moodboards de referência.
- `border-radius`: **0 a 4px**, no máximo. O sistema é quadrado — evitar cantos muito arredondados em qualquer componente.
- Bordas finas de 1px (`--border`) delimitando cards, nunca sombra pesada. Sombra, se usada, é sutil e só no tema claro.
- Espaçamento em escala de 4px (`4, 8, 12, 16, 24, 32, 48, 64, 96`).
- Textura opcional de fundo: grade de pontos (`dot-grid`) ou pixels em baixa opacidade (`8–15%`) sobre `--surface`, como visto em `image copy 2.png` — usar preto/branco, nunca colorido.

## Componentes-base

### Botão primário (CTA)
Fundo `--accent`, texto `--accent-fg`, mono uppercase, sem radius (ou `2px`), padding `12px 20px`. Hover: leve escurecimento do amarelo (`#E6BF00`), nunca troca de cor.

### Botão secundário
Fundo transparente, borda 1px `--border`, texto `--fg`, mesmo padding e tipografia do primário. Hover: borda vira `--fg`.

### Badge / tag
Texto mono uppercase pequeno (`11–12px`), padding `4px 10px`, fundo `--surface-2`, borda 1px `--border`. Usar para status de lote, categoria de evento, contagem regressiva.

### Card de evento
Retângulo com borda 1px, imagem no topo (duotone preto/branco, sem cor — o amarelo pode entrar como overlay sutil de gradiente na base da imagem), título em mono, metadados (data/local) em mono menor com `--fg-muted`, preço/CTA no rodapé em destaque `--accent`.

### Navegação
Barra fixa, fundo `--bg`, borda inferior 1px `--border`, logo à esquerda (mono, caixa alta), links mono no centro/direita, CTA amarelo à extrema direita — mesmo layout do header em `image.png`.

## Imagens

- Fotos e ilustrações tratadas em **duotone preto/branco** (alto contraste, grão leve permitido) para manter unidade com o restante do site — nunca fotos coloridas soltas.
- Ícones: traço fino (`stroke`, 1.5px), monocromáticos (`--fg` ou `--accent`), nunca preenchidos coloridos.

## O que evitar

> [!danger] Não fazer
> - Segunda cor de acento (verde, azul, roxo, gradiente multicolor).
> - `border-radius` grande (pill buttons, cards muito arredondados).
> - Sombra pesada / glassmorphism / blur excessivo.
> - Fontes serifadas ou script.
> - Amarelo como cor de fundo de página inteira (ele é acento, não base).

## Relação com outros documentos

Este documento define a linguagem visual; a implementação de componentes React/Tailwind fica em [[frontend/manifesto]]. Fluxos de tela (não visual) estão em [[fluxos]]. Convenções de código gerais em [[guidelines]].
