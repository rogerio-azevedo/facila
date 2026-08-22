import "server-only";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { companyMembers, companies, users } from "@/server/db/schema";
import type { RegisterInput } from "@/schemas/auth";
import { slugify } from "@/lib/slugify";
import { isSuperAdminEmail } from "@/server/dal/users";

export async function registerCompanyWithAdmin(input: RegisterInput) {
  if (isSuperAdminEmail(input.email)) {
    throw new Error("super-admin-register");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  let slug = slugify(input.companyName);
  const existingSlug = await db.query.companies.findFirst({
    where: eq(companies.slug, slug),
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

    const [company] = await tx
      .insert(companies)
      .values({
        name: input.companyName,
        slug,
      })
      .returning();

    await tx.insert(companyMembers).values({
      companyId: company.id,
      userId: user.id,
      role: "admin",
    });

    return { user, company };
  });
}

export async function createCompanyAsSuperAdmin(input: {
  name: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
}) {
  let slug = slugify(input.name);
  const existingSlug = await db.query.companies.findFirst({
    where: eq(companies.slug, slug),
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

    const [company] = await tx
      .insert(companies)
      .values({
        name: input.name,
        slug,
      })
      .returning();

    const existingMembership = await tx.query.companyMembers.findFirst({
      where: (members, { and, eq: eqFn }) =>
        and(eqFn(members.companyId, company.id), eqFn(members.userId, user!.id)),
    });

    if (!existingMembership) {
      await tx.insert(companyMembers).values({
        companyId: company.id,
        userId: user!.id,
        role: "admin",
      });
    }

    return company;
  });
}

export async function listAllCompanies() {
  return db.query.companies.findMany({
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
}

export async function getCompanyById(companyId: string) {
  return db.query.companies.findFirst({
    where: eq(companies.id, companyId),
  });
}
