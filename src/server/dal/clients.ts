import "server-only";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { clientMembers, clients, users } from "@/server/db/schema";
import type { RegisterInput } from "@/schemas/auth";
import { slugify } from "@/lib/slugify";
import { isSuperAdminEmail } from "@/server/dal/users";

export async function registerClientWithAdmin(input: RegisterInput) {
  if (isSuperAdminEmail(input.email)) {
    throw new Error("super-admin-register");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  let slug = slugify(input.companyName);
  const existingSlug = await db.query.clients.findFirst({
    where: eq(clients.slug, slug),
  });

  if (existingSlug) {
    slug = `${slug}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        passwordHash,
        platformRole: "user",
      })
      .returning();

    const [client] = await tx
      .insert(clients)
      .values({
        name: input.companyName,
        slug,
      })
      .returning();

    await tx.insert(clientMembers).values({
      clientId: client.id,
      userId: user.id,
      role: "admin",
    });

    return { user, client };
  });
}

export async function createClientAsSuperAdmin(input: {
  name: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
}) {
  let slug = slugify(input.name);
  const existingSlug = await db.query.clients.findFirst({
    where: eq(clients.slug, slug),
  });

  if (existingSlug) {
    slug = `${slug}-${crypto.randomUUID().slice(0, 8)}`;
  }

  const passwordHash = await bcrypt.hash(input.adminPassword, 12);

  return db.transaction(async (tx) => {
    let user = await tx.query.users.findFirst({
      where: eq(users.email, input.adminEmail),
    });

    if (!user) {
      [user] = await tx
        .insert(users)
        .values({
          name: input.adminName,
          email: input.adminEmail,
          passwordHash,
          platformRole: isSuperAdminEmail(input.adminEmail) ? "super_admin" : "user",
        })
        .returning();
    }

    const [client] = await tx
      .insert(clients)
      .values({
        name: input.name,
        slug,
      })
      .returning();

    const existingMembership = await tx.query.clientMembers.findFirst({
      where: (members, { and, eq: eqFn }) =>
        and(eqFn(members.clientId, client.id), eqFn(members.userId, user!.id)),
    });

    if (!existingMembership) {
      await tx.insert(clientMembers).values({
        clientId: client.id,
        userId: user!.id,
        role: "admin",
      });
    }

    return client;
  });
}

export async function listAllClients() {
  return db.query.clients.findMany({
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
}

export async function getClientById(clientId: string) {
  return db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });
}
