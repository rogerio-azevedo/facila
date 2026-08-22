import "server-only";

import { eq } from "drizzle-orm";

import type { CompanyNameInput } from "@/schemas/companies";
import { slugify } from "@/lib/slugify";
import { db, type DbTransaction } from "@/server/db";
import { companies } from "@/server/db/schema";

function dbOrTx(tx?: DbTransaction) {
  return tx ?? db;
}

async function resolveUniqueSlug(name: string, tx?: DbTransaction) {
  let slug = slugify(name);
  const existingSlug = await dbOrTx(tx).query.companies.findFirst({
    where: eq(companies.slug, slug),
  });

  if (existingSlug) {
    slug = `${slug}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return slug;
}

export async function createCompany(input: CompanyNameInput, tx?: DbTransaction) {
  const slug = await resolveUniqueSlug(input.name, tx);

  const [company] = await dbOrTx(tx)
    .insert(companies)
    .values({
      name: input.name,
      slug,
    })
    .returning();

  return company!;
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
