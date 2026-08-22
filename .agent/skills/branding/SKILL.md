---
name: branding
description: Paleta de cores e identidade visual da Facila. Use ao criar telas, componentes, estilos ou quando o usuário mencionar branding, cores da marca ou logo.
---

# Branding Facila

## Fonte da verdade

Cores vivem **somente** em `src/app/globals.css`. Não inventar hex em componentes.

## Paleta

| Token                | Hex       | Classe Tailwind                       | Uso                                       |
| -------------------- | --------- | ------------------------------------- | ----------------------------------------- |
| `navy`               | `#003366` | `bg-navy`, `text-navy`, `border-navy` | Header, sidebar, chrome da marca          |
| `primary`            | `#1976d2` | `bg-primary`, `text-primary`          | Botões, links, ações, destaque interativo |
| `primary-foreground` | `#ffffff` | `text-primary-foreground`             | Texto sobre `primary`                     |
| `sky`                | `#b3e5fc` | `bg-sky`, `text-sky`                  | Fundo suave, chips, hover leve            |
| `background`         | `#f5f5f5` | `bg-background`                       | Fundo da página                           |
| `foreground`         | `#212121` | `text-foreground`                     | Texto principal                           |

## Regras

- **Não** usar hex hardcoded em JSX/CSS de componentes — usar tokens (`bg-primary`, `text-foreground`, etc.).
- **Não** usar cores genéricas do starter (`zinc-*`, `black`, `white` como tema) em telas novas.
- `primary` = ação interativa; `navy` = estrutura/marca (nav, sidebar).
- `sky` = acento leve, nunca como cor principal de botão.
- Dark mode da marca ainda não existe — não adicionar `dark:` com cores arbitrárias.

## Logo

- Arquivo: `public/facila.svg`
- URL: `/facila.svg`
- Usar com `next/image` ou `<img>`; não alterar cores do SVG sem pedido explícito.

## Exemplos

```tsx
// Botão primário
<button className="bg-primary text-primary-foreground">Salvar</button>

// Header da app
<header className="bg-navy text-primary-foreground">...</header>

// Card sobre fundo da página
<div className="rounded-lg bg-background text-foreground">...</div>

// Destaque suave
<span className="rounded bg-sky px-2 py-1 text-foreground">Novo</span>
```
