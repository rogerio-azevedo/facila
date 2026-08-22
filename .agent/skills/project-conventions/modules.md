# Criar um módulo novo

Exemplo: módulo `contracts` (contratos).

## 1. Schema Drizzle

Em `src/server/db/schema/` ou `src/modules/contracts/schema.ts`:

```ts
export const contracts = pgTable('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

Sempre `clientId` + índice.

Depois: `pnpm db:generate` → revisar SQL → `pnpm db:migrate`.

## 2. Zod

`src/schemas/contracts.ts`:

```ts
export const createContractSchema = z.object({
  title: z.string().min(1).max(200),
})
```

Actions recebem `unknown` e fazem `safeParse`.

## 3. DAL

`src/server/dal/contracts.ts`:

```ts
import 'server-only'
import { requireClientContext } from './context'

export async function listContracts() {
  const ctx = await requireClientContext()
  return db.select().from(contracts).where(eq(contracts.clientId, ctx.clientId))
}

export async function createContract(input: CreateContractInput) {
  const ctx = await requireClientContext()
  if (!can(ctx, 'contracts:create')) throw new ForbiddenError()
  // insert com ctx.clientId
}
```

## 4. Actions

`src/actions/contracts.ts`:

```ts
'use server'
export async function createContractAction(input: unknown) {
  const parsed = createContractSchema.safeParse(input)
  if (!parsed.success) return { error: 'validation' }
  await createContract(parsed.data)
  revalidatePath('/contracts')
  return { success: true }
}
```

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
'contracts:read': (ctx) => true // dentro do client
```

## 7. Nomenclatura

| Termo | Significado |
|-------|-------------|
| `clients` | Empresa assinante do ERP |
| `customers` | Cliente final do assinante (CRM) |
| `users` | Pessoa com login |
| `clientMembers` | vínculo user ↔ client + role |

## Anti-patterns

- Query sem `clientId` em tabela de negócio
- Action com lógica de banco inline
- Prop `user: FullUser` em Client Component
- Zustand guardando lista de contratos
