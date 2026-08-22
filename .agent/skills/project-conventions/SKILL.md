---
name: project-conventions
description: Convenções do ERP Facila (Next 16, DAL, Auth.js, Drizzle, multi-empresa com super_admin). Use ao criar módulos, actions, telas, schemas, auth ou alterar arquitetura. Sempre aplicar junto com vercel-react-best-practices ao escrever ou revisar UI React/Next.
---

# Convenções do projeto Facila

## Stack

Next 16+ · React 19+ · TypeScript · Tailwind 4 · shadcn/ui · PostgreSQL (Neon) · Drizzle · Zod · Auth.js · Zustand (estado global de UI)

## Gerenciamento de pacotes

- Use **exclusivamente pnpm** para instalar dependências e executar scripts.
- `pnpm-lock.yaml` é o único lockfile do projeto; não criar ou manter `package-lock.json`, `yarn.lock` ou `bun.lock`.
- Exemplos: `pnpm install`, `pnpm add <pacote>`, `pnpm add -D <pacote>` e `pnpm <script>`.
- Não usar `npm`, `npx`, `yarn` ou `bun`. Para CLIs temporárias, usar `pnpm dlx`.

## Skill complementar (obrigatória na UI)

Ao criar, alterar ou revisar páginas, componentes, Server Actions ou data fetching, **leia e siga** [vercel-react-best-practices](../../../.agents/skills/vercel-react-best-practices/SKILL.md).

- Comece pelo `SKILL.md` da Vercel; abra só as rules relevantes em `rules/` (não carregue o `AGENTS.md` inteiro).
- Prioridade crítica: waterfalls (`async-*`), bundle (`bundle-*`), server (`server-*`).
- Conflito: **esta skill manda** em pastas, DAL, auth, tenant e segurança. A da Vercel manda em performance React/Next (RSC, serialização, Suspense, imports).

## Modelo de acesso

- **Plataforma Facila** + `super_admin` (você)
- **`companies`** = empresas que contratam o ERP (tenant)
- **`clients`** = clientes finais da company (CRM — contratos, NF)
- Papéis por company: `admin` | `member`
- `activeCompanyId` vem **só da sessão JWT**, nunca do cliente (FormData, query, etc.)

## Rotas (`src/app`)

`src/app` é a pasta do App Router do Next. Rotas são irmãs, sem grupo `(app)` dentro.

```
src/app/
  layout.tsx + page.tsx + globals.css
  (auth)/login  register     → /login, /register   (grupo só de layout)
  dashboard/                 → /dashboard
  platform/companies/        → /platform/companies
  api/auth/[...nextauth]/
```

Módulos futuros: `src/app/clients/`, `src/app/contracts/` — cada um com `page.tsx` (e `layout.tsx` se precisar do AppShell).

## Onde colocar cada coisa

| O quê | Onde |
|-------|------|
| Página / layout | `src/app/` |
| Server Action (porta fina) | `src/actions/` |
| Backend (DAL, auth, db) | `src/server/` — sempre `import "server-only"` |
| Schemas Zod | `src/schemas/` |
| UI shadcn | `src/components/ui/` |
| Estado global/compartilhado de UI | `src/stores/` — usar Zustand; **nunca** dados de negócio |
| Módulo de domínio | `src/modules/<nome>/` |

## Regras de arquitetura

1. **Ler dados**: Server Component → DAL direto. Não `fetch` em `/api` próprio.
2. **Mutar dados**: Server Action fina → valida com Zod → chama DAL → `revalidatePath` / `updateTag`.
3. **Route Handlers**: só Auth.js, webhooks, downloads públicos.
4. **`proxy.ts`**: redirect de auth. **Não** substitui authz na DAL.
5. Toda tabela de negócio tem `companyId` (tenant). Tabelas de CRM (ex.: `clients`, `contracts`) também filtram por `ctx.companyId`.

## Fluxo de contexto

```ts
getCurrentContext() // src/server/dal/context.ts
// super_admin + activeCompanyId → act-as
// super_admin sem company → plataforma (DAL de negócio recusa)
// admin | member → companyId da sessão
```

## Checklist rápido (nova feature)

- [ ] Schema Drizzle com `companyId` se for dado de tenant ou CRM
- [ ] Zod em `src/schemas/`
- [ ] DAL em `src/server/dal/` com auth + authz
- [ ] Action fina em `src/actions/`
- [ ] UI em RSC quando possível; `"use client"` só para interatividade
- [ ] Aplicar [vercel-react-best-practices](../../../.agents/skills/vercel-react-best-practices/SKILL.md) (sem waterfalls, sem barrel imports, DTO mínimo no client)
- [ ] Policies em `src/server/policies/` para `can(ctx, action)`

## Banco de dados (migrations)

**Não usar `drizzle-kit push`.** Sempre migrations versionadas em `drizzle/`.

Fluxo ao alterar schema:

1. Editar `src/server/db/schema/`
2. `pnpm db:generate` — gera SQL em `drizzle/`
3. Revisar o `.sql` gerado
4. `pnpm db:migrate` — aplica no Neon

Scripts: `db:generate` · `db:migrate` · `db:studio`

Se o banco já existia antes das migrations (ex.: criado com push), rodar **uma vez**: `pnpm db:baseline`.

Commitar sempre `drizzle/` junto com mudanças de schema.

## Referências

- [architecture.md](architecture.md) — RSC vs Action vs DAL
- [security.md](security.md) — tenant, super_admin, act-as
- [modules.md](modules.md) — criar módulo novo
- [vercel-react-best-practices](../../../.agents/skills/vercel-react-best-practices/SKILL.md) — performance React/Next (Vercel)

## Next.js 16

Leia `node_modules/next/dist/docs/` antes de usar APIs novas. Este projeto usa App Router, Server Actions e `proxy.ts` (não `middleware.ts`).
