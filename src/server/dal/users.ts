import "server-only";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { users } from "@/server/db/schema";

export function isSuperAdminEmail(email: string) {
  const configured = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
  return configured ? email.toLowerCase() === configured : false;
}

export async function getPostLoginRedirect(email: string): Promise<string> {
  if (isSuperAdminEmail(email)) {
    return "/platform/clients";
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (user?.platformRole === "super_admin") {
    return "/platform/clients";
  }

  return "/dashboard";
}

export async function registerSuperAdmin(input: {
  name: string;
  email: string;
  password: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);

  const existing = await db.query.users.findFirst({
    where: eq(users.email, input.email.toLowerCase()),
  });

  if (existing) {
    throw new Error("unique");
  }

  const [user] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      platformRole: "super_admin",
    })
    .returning();

  return { user };
}
