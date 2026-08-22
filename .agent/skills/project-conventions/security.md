# Segurança Facila

## Princípios

1. **Zero trust no cliente** — FormData, searchParams, headers e body são não confiáveis.
2. **`clientId` da sessão** — nunca aceitar do request para escopo de dados.
3. **Authz na DAL** — toda operação revalida sessão e permissão.
4. **`server-only`** — db, dal, auth não importam em Client Components.

## Sessão JWT (Auth.js)

```ts
{
  userId: string
  platformRole: 'super_admin' | 'user'
  activeClientId: string | null
  clientRole: 'admin' | 'member' | null
  isActingAs: boolean
}
```

### super_admin

- Sem `activeClientId`: visão plataforma (gerir clientes)
- Com `activeClientId`: act-as (`isActingAs: true`); queries filtram esse client
- Act-as via Server Action que valida existência do client e atualiza JWT

### Usuário de cliente

- `activeClientId` obrigatório após login
- Deve existir em `client_members` para aquele client
- `clientRole`: `admin` | `member`

## getCurrentContext()

Retornos:

| Cenário | clientId | role | isActingAs |
|---------|----------|------|------------|
| super_admin plataforma | null | super_admin | false |
| super_admin act-as | uuid | super_admin | true |
| admin/member | uuid | admin \| member | false |

DAL de negócio de cliente **exige** `clientId !== null`.

## Policies

```ts
can(ctx, 'clients:manage') // admin ou super_admin act-as
can(ctx, 'platform:clients') // só super_admin sem act-as
```

Super admin em act-as segue policies de cliente **ou** bypass explícito documentado.

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
  and(eq(invoices.id, inputId), eq(invoices.clientId, ctx.clientId))
)
```

## Variáveis de ambiente

- `DATABASE_URL`, `AUTH_SECRET`, OAuth — só em server
- `NEXT_PUBLIC_*` — nunca segredos
- Não commitar `.env`

## Seed super_admin

Promover via `SUPER_ADMIN_EMAIL` no primeiro login/registro ou script — não hardcodar e-mail no código.
