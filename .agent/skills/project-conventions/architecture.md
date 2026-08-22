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
- Chamam DAL diretamente: `const data = await listClients(ctx)`
- Performance (waterfalls, Suspense, serialização RSC): seguir [vercel-react-best-practices](../../../.agents/skills/vercel-react-best-practices/SKILL.md)

### Server Actions

- Formulários, botões de mutação
- Arquivo com `'use server'` no topo
- **Finas**: parse → DAL → revalidate → retorno mínimo

```ts
'use server'
export async function createClientAction(input: unknown) {
  const parsed = createClientSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten() }
  await createClient(parsed.data) // DAL
  revalidatePath('/platform/clients')
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
- Preferências de colunas de tabela
- Coordenação global de modais

**Proibido**: cache de entidades, sessão, `clientId`, listas de negócio.

## Módulos de domínio

```
src/modules/<nome>/
  schema.ts      # Drizzle (se específico do módulo)
  dal.ts         # ou dal/*.ts
  actions.ts     # re-export ou actions locais
  components/    # UI do módulo
```

Módulos compartilham `getCurrentContext()` e policies globais.

## Cache e revalidação

- Após mutação que o usuário deve ver na hora: `revalidatePath` ou `updateTag`
- Preferir tags por módulo: `clients`, `contracts`, etc.

## proxy.ts vs DAL

| | proxy.ts | DAL |
|---|----------|-----|
| Objetivo | Redirect se não logado | Auth + authz + dados |
| Segurança | Superficial | Obrigatória |
| super_admin act-as | Não decide escopo | Decide via sessão |
