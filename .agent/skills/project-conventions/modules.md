# Criar uma entidade de negócio nova

Exemplo: entidade `contracts` (contratos emitidos para um client da company).

## Regra 1:1 (critério absoluto)

Cada `pgTable` de negócio gera **quatro arquivos com o mesmo nome**:

| Camada | Arquivo |
|--------|---------|
| Drizzle | `src/server/db/schema/contracts.ts` |
| Zod | `src/schemas/contracts.ts` |
| DAL | `src/server/dal/contracts.ts` |
| Actions | `src/actions/contracts.ts` |

**Não** colocar schema/DAL/actions em `src/modules/`. UI pode ficar em `src/components/contracts/` e rotas em `src/app/contracts/`.

## 1. Schema Drizzle

`src/server/db/schema/contracts.ts`:

```ts
export const contracts = pgTable('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

Sempre `companyId` + índice. CRM (`clients`, `contracts`, `invoices`) também referencia o client final.

Depois: `pnpm db:generate` → revisar SQL → `pnpm db:migrate`.

## 2. Zod

`src/schemas/contracts.ts` — descreve **somente** campos da tabela `contracts`:

```ts
export const contractSchema = z.object({
  clientId: z.uuid(),
  title: z.string().min(1).max(200),
})
```

Actions recebem `unknown` e fazem `safeParse`.

## 3. DAL

`src/server/dal/contracts.ts` — **só** a tabela `contracts`:

```ts
import 'server-only'
import { requireCompanyContext } from './context'

export async function listContracts() {
  const ctx = await requireCompanyContext()
  return db.select().from(contracts).where(eq(contracts.companyId, ctx.companyId))
}

export async function createContract(input: CreateContractInput, tx?: DbTx) {
  const ctx = await requireCompanyContext()
  if (!can(ctx, 'contracts:create')) throw new ForbiddenError()
  const dbOrTx = tx ?? db
  // insert com ctx.companyId + validar clientId pertence à company (via dal/clients.getClientById)
}
```

Funções de escrita aceitam `tx` opcional quando a action orquestra transaction.

## 4. Actions

`src/actions/contracts.ts`:

```ts
'use server'
export async function createContractAction(input: unknown) {
  const parsed = contractSchema.safeParse(input)
  if (!parsed.success) return { error: 'validation' }
  await createContract(parsed.data)
  revalidatePath('/contracts')
  return { success: true }
}
```

Se a operação envolve duas entidades (ex.: client + address), a **action de domínio principal** orquestra; cada metade valida no Zod da própria entidade.

## 5. Rotas

```
src/app/contracts/page.tsx       # /contracts
src/app/contracts/new/page.tsx   # /contracts/new
```

`proxy.ts` já exige auth em `/dashboard` e `/platform`. Reutilize o `AppShell` no `layout.tsx` do módulo.

## 6. Policies

Adicionar ações em `src/server/policies/index.ts`:

```ts
'contracts:create': (ctx) => ctx.role === 'admin' || ctx.role === 'super_admin'
'contracts:read': (ctx) => ctx.kind === 'company'
```

## 7. Nomenclatura

| Termo | Significado |
|-------|-------------|
| `companies` | Empresa assinante do ERP (tenant) |
| `companyMembers` | vínculo user ↔ company + role |
| `clients` | Cliente final da company (CRM) |
| `addresses` | Endereços (company ou client) |
| `users` | Pessoa com login |

## Anti-patterns

- Query sem `companyId` em tabela de negócio
- DAL de `clients` inserindo em `addresses` (ou vice-versa)
- Join escondido no DAL para "embutir" entidade relacionada
- Action com lógica de banco inline
- Prop `user: FullUser` em Client Component
- Zustand guardando lista de contratos
- Entidade nova sem os quatro arquivos 1:1
