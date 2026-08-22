import "server-only";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import type { UserInput } from "@/schemas/users";
import { db, type DbTransaction } from "@/server/db";
import { users } from "@/server/db/schema";

function dbOrTx(tx?: DbTransaction) {
  return tx ?? db;
}

export function isSuperAdminEmail(email: string) {
  const configured = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
  return configured ? email.toLowerCase() === configured : false;
}

export async function findUserByEmail(email: string, tx?: DbTransaction) {
  return dbOrTx(tx).query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });
}

export async function createUser(
  input: UserInput & { platformRole?: "user" | "super_admin" },
  tx?: DbTransaction,
) {
  const passwordHash = await bcrypt.hash(input.password, 12);

  const [user] = await dbOrTx(tx)
    .insert(users)
    .values({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      platformRole: input.platformRole ?? "user",
    })
    .returning();

  return user!;
}

export async function getPostLoginRedirect(email: string): Promise<string> {
  if (isSuperAdminEmail(email)) {
    return "/platform/companies";
  }

  const user = await findUserByEmail(email);

  if (user?.platformRole === "super_admin") {
    return "/platform/companies";
  }

  return "/dashboard";
}

export async function registerSuperAdmin(input: UserInput) {
  const existing = await findUserByEmail(input.email);

  if (existing) {
    throw new Error("unique");
  }

  const user = await createUser({
    ...input,
    platformRole: "super_admin",
  });

  return { user };
}
