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
| Cabeçalho de página (título/ações) | `src/components/page-header.tsx` — declarado na page, renderizado no `AppShell` |
| Módulo de domínio | `src/modules/<nome>/` |

## Cabeçalho de página (header único)

Toda página autenticada (dentro do `AppShell`) declara título, descrição e ações com `<PageHeader />`. O `AppHeader` sticky do layout renderiza esse conteúdo — **não** criar segundo cabeçalho (`h1` + botão) no corpo da página.

```tsx
<PageHeader
  title="Clientes"
  description="Cadastro fiscal completo para emissão de notas."
  actions={<Button asChild><Link href="/clients/new">Novo cliente</Link></Button>}
/>
```

Regras:

- **Título de sub-rota** é da página (`Novo cliente`, nome do registro), não o label do módulo na sidebar.
- **Descrição** é opcional; se omitida, a linha some do header.
- **Ações** ficam à direita no header (primária ou secundária, ex.: `Voltar`).
- **Nome da empresa** aparece na sidebar (acima do usuário logado), não no header.
- Páginas RSC continuam RSC; só `<PageHeader />` é client.

## 1:1 entidade → arquivos (critério absoluto)

Toda tabela de negócio (`pgTable`) **obrigatoriamente** tem os quatro arquivos com o **mesmo nome**, na estrutura flat do repo:

```
src/server/db/schema/<entidade>.ts   # Drizzle
src/schemas/<entidade>.ts            # Zod
src/server/dal/<entidade>.ts         # queries/mutações SÓ desta tabela
src/actions/<entidade>.ts            # Server Actions desta entidade
```

Regras **não negociáveis**:

1. **DAL de uma entidade não escreve em outra tabela.** `dal/clients.ts` não faz `insert` em `addresses`.
2. **Orquestração multi-entidade é da Action** (ex.: `createClientAction` abre `db.transaction` e chama `createClient` + `createAddress`).
3. **Zod descreve só a entidade.** Formulários compostos validam `{ client, address }` com schemas separados — sem "super schema" de duas tabelas.
4. **RSC compõe leituras.** Page chama `getClientById` + `getPrimaryAddressForClient` em paralelo — sem join escondido no DAL de outra entidade.
5. **Gate de Zod**: schema só entra no arquivo cujo nome é o da tabela. Se o arquivo não existe, **criar** — nunca colocar no "arquivo mais próximo" (`auth.ts` não é lixeira).
6. **Junction também é 1:1.** `company_members` tem os quatro arquivos próprios (`company-members.ts`), não vive dentro de `companies`.
7. **Exceções** (sem tabela própria): `dal/context.ts`, `dal/session.ts` (pode *ler* via DAL de outras entidades), `policies/`, `actions/geocode.ts`. Auth.js: somente `src/server/db/schema/auth.ts` (`user` + `account` do adapter). `src/schemas/auth.ts` fica **só** com `loginSchema` + `AuthFormState` — company, client, address, member **proibidos** ali.

**Proibido**: entidade nova "de carona" no arquivo de outra; DAL que mistura tabelas; Zod de company/client em `schemas/auth.ts`; `src/modules/` como caminho de entidades de negócio (dois padrões).

## Inventário de entidades (atualizar ao criar tabela)

Consulte antes de criar ou mover arquivos. Cada linha = quatro arquivos com o **mesmo nome** (exceto Auth.js e infra).

| Entidade | Drizzle | Zod | DAL | Actions |
|----------|---------|-----|-----|---------|
| `user` / `account` | `db/schema/auth.ts` | `schemas/users.ts` | `dal/users.ts` | `actions/auth.ts` |
| `companies` | `db/schema/companies.ts` | `schemas/companies.ts` | `dal/companies.ts` | `actions/companies.ts` |
| `company_members` | `db/schema/company-members.ts` | `schemas/company-members.ts` | `dal/company-members.ts` | (orquestrado por auth/companies) |
| `clients` | `db/schema/clients.ts` | `schemas/clients.ts` | `dal/clients.ts` | `actions/clients.ts` |
| `addresses` | `db/schema/addresses.ts` | `schemas/addresses.ts` | `dal/addresses.ts` | `actions/addresses.ts` |
| `contracts` | `db/schema/contracts.ts` | `schemas/contracts.ts` | `dal/contracts.ts` | `actions/contracts.ts` |
| `accounts_receivable` | `db/schema/accounts-receivable.ts` | `schemas/accounts-receivable.ts` | `dal/accounts-receivable.ts` | `actions/accounts-receivable.ts` |
| `billing_runs` | `db/schema/billing-runs.ts` | `schemas/billing-runs.ts` | `dal/billing-runs.ts` | `actions/billing-runs.ts` |
| `billing_run_items` | `db/schema/billing-run-items.ts` | `schemas/billing-run-items.ts` | `dal/billing-run-items.ts` | `actions/billing-run-items.ts` |

Login (sem tabela): `schemas/auth.ts` · Infra: `dal/context.ts`, `dal/session.ts`

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

## Checklist rápido (nova entidade de negócio)

- [ ] `src/server/db/schema/<entidade>.ts` (Drizzle)
- [ ] `src/schemas/<entidade>.ts` (Zod)
- [ ] `src/server/dal/<entidade>.ts` (auth + authz; só esta tabela)
- [ ] `src/actions/<entidade>.ts` (orquestra se precisar de outras entidades)
- [ ] Schema com `companyId` se for dado de tenant ou CRM
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
