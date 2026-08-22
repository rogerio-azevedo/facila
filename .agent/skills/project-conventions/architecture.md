# Arquitetura Facila

## Camadas

```
UI (RSC / Client Component)
  ↓
Server Action (src/actions/)     ← validação Zod, orquestração
  ↓
DAL (src/server/dal/)            ← auth, authz, queries, DTOs
  ↓
Drizzle + Neon
```

## Quando usar cada peça

### Server Components (padrão)

- Listagens, dashboards, layouts
- Chamam DAL diretamente: `const data = await listCompanies(ctx)`
- Performance (waterfalls, Suspense, serialização RSC): seguir [vercel-react-best-practices](../../../.agents/skills/vercel-react-best-practices/SKILL.md)

### Server Actions

- Formulários, botões de mutação
- Arquivo com `'use server'` no topo — **um arquivo por entidade** (`src/actions/<entidade>.ts`)
- **Finas**: parse → DAL → revalidate → retorno mínimo
- **Orquestração multi-entidade**: a action abre a transaction e chama um DAL por tabela; nunca um DAL escrevendo em outra entidade

```ts
'use server'
export async function createClientAction(input: unknown) {
  const clientParsed = clientSchema.safeParse(input.client)
  const addressParsed = addressSchema.safeParse(input.address)
  if (!clientParsed.success || !addressParsed.success) {
    return { error: 'validation' }
  }
  await db.transaction(async (tx) => {
    const client = await createClient(tx, clientParsed.data)      // dal/clients.ts
    await createAddress(tx, { ...addressParsed.data, clientOwnerId: client.id }) // dal/addresses.ts
  })
  revalidatePath('/clients')
  return { success: true }
}
```

### Route Handlers (`app/api/.../route.ts`)

Use **apenas** para:

- Auth.js (`/api/auth/[...nextauth]`)
- Webhooks de terceiros
- Downloads/arquivos com URL pública

**Não** use para CRUD interno da aplicação.

### Estado de interface

Use Zustand como padrão para estado global de UI compartilhado entre áreas independentes da árvore. Em aplicações Next com SSR, crie a store por instância do provider e inicialize-a com os dados recebidos do servidor; não use uma singleton compartilhada entre requisições.

Estado local e Context continuam permitidos para comportamento efêmero e interno de componentes. Stores Zustand são somente para estado de interface:

- Sidebar aberta/fechada
- Cabeçalho da página ativa (título, descrição, ações)
- Preferências de colunas de tabela
- Coordenação global de modais

**Proibido**: cache de entidades, sessão, `companyId`, listas de negócio.

## Entidades de negócio (padrão oficial)

```
src/server/db/schema/<entidade>.ts
src/schemas/<entidade>.ts
src/server/dal/<entidade>.ts
src/actions/<entidade>.ts
```

Junction tables (`company_members`) seguem o mesmo padrão — **não** ficam dentro do arquivo da entidade pai.

Formulário composto = N schemas + 1 action orquestradora:

```ts
// register: user + company (dois Zod, uma action)
const userParsed = userSchema.safeParse({ name, email, password })
const companyParsed = companyNameSchema.safeParse({ name: companyName })
await db.transaction(async (tx) => {
  const user = await createUser(userParsed.data, tx)
  const company = await createCompany(companyParsed.data, tx)
  await addMember({ companyId: company.id, userId: user.id, role: 'admin' }, tx)
})
```

`src/schemas/auth.ts` = **somente login**. Schemas de company, user, client etc. ficam nos arquivos 1:1 da entidade.

UI de feature em `src/app/<rota>/` e `src/components/<feature>/`. **Não** usar `src/modules/` para entidades de negócio — evita dois padrões paralelos.

## Módulos de domínio (`src/modules/`)

Reservado para **composição de UI** ou helpers de feature sem tabela própria. Se a feature tem `pgTable`, os quatro arquivos acima são obrigatórios na estrutura flat.

## Cache e revalidação

- Após mutação que o usuário deve ver na hora: `revalidatePath` ou `updateTag`
- Preferir tags por módulo: `companies`, `clients`, `contracts`, etc.

## proxy.ts vs DAL

| | proxy.ts | DAL |
|---|----------|-----|
| Objetivo | Redirect se não logado | Auth + authz + dados |
| Segurança | Superficial | Obrigatória |
| super_admin act-as | Não decide escopo | Decide via sessão |
