# Segurança Facila

## Princípios

1. **Zero trust no cliente** — FormData, searchParams, headers e body são não confiáveis.
2. **`companyId` da sessão** — nunca aceitar do request para escopo de tenant.
3. **Authz na DAL** — toda operação revalida sessão e permissão.
4. **`server-only`** — db, dal, auth não importam em Client Components.

## Sessão JWT (Auth.js)

```ts
{
  userId: string
  platformRole: 'super_admin' | 'user'
  activeCompanyId: string | null
  companyRole: 'admin' | 'member' | null
  isActingAs: boolean
}
```

### super_admin

- Sem `activeCompanyId`: visão plataforma (gerir companies)
- Com `activeCompanyId`: act-as (`isActingAs: true`); queries filtram essa company
- Act-as via Server Action que valida existência da company e atualiza JWT

### Usuário de company

- `activeCompanyId` obrigatório após login
- Deve existir em `company_members` para aquela company
- `companyRole`: `admin` | `member`

## getCurrentContext()

Retornos:

| Cenário | companyId | role | isActingAs |
|---------|-----------|------|------------|
| super_admin plataforma | null | super_admin | false |
| super_admin act-as | uuid | super_admin | true |
| admin/member | uuid | admin \| member | false |

DAL de negócio da company **exige** `companyId !== null`.

## Policies

```ts
can(ctx, 'companies:manage') // admin ou super_admin act-as
can(ctx, 'platform:companies') // só super_admin sem act-as
can(ctx, 'clients:manage') // CRM dentro da company
```

Super admin em act-as segue policies de company **ou** bypass explícito documentado.

## Server Actions

Toda action pública (POST direto) deve:

1. Autenticar (`auth()`)
2. Validar input (Zod)
3. Delegar à DAL (authz lá também)
4. Retornar DTO mínimo (nunca row bruta do banco)

## IDOR

```ts
// ERRADO
await db.select().from(invoices).where(eq(invoices.id, inputId))

// CERTO
await db.select().from(invoices).where(
  and(eq(invoices.id, inputId), eq(invoices.companyId, ctx.companyId))
)
```

## Variáveis de ambiente

- `DATABASE_URL`, `AUTH_SECRET`, OAuth — só em server
- `NEXT_PUBLIC_*` — nunca segredos
- Não commitar `.env`

## Seed super_admin

Promover via `SUPER_ADMIN_EMAIL` no primeiro login/registro ou script — não hardcodar e-mail no código.
