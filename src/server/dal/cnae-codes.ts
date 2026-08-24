import "server-only";

import { ilike, or, sql } from "drizzle-orm";

import type { EnsureCnaeCodeInput } from "@/schemas/cnae-codes";
import type { ReferenceCodeSearchInput } from "@/schemas/municipalities";
import { db } from "@/server/db";
import { cnaeCodes } from "@/server/db/schema";
import { ForbiddenError, requireCompanyContext } from "@/server/dal/context";
import { can } from "@/server/policies";

export async function searchCnaeCodes(input: ReferenceCodeSearchInput) {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:read")) {
    throw new ForbiddenError();
  }

  const q = input.q.trim();
  const digits = q.replace(/\D/g, "");
  const hasDigitQuery = digits.length >= 2;

  const rows = await db
    .select({
      code: cnaeCodes.code,
      description: cnaeCodes.description,
    })
    .from(cnaeCodes)
    .where(
      hasDigitQuery
        ? or(
            ilike(cnaeCodes.code, `${digits}%`),
            ilike(cnaeCodes.code, `%${digits}%`),
            ilike(cnaeCodes.description, `%${q}%`),
          )
        : ilike(cnaeCodes.description, `%${q}%`),
    )
    .orderBy(
      hasDigitQuery
        ? sql`CASE
            WHEN ${cnaeCodes.code} = ${digits} THEN 0
            WHEN ${cnaeCodes.code} LIKE ${`${digits}%`} THEN 1
            WHEN ${cnaeCodes.code} LIKE ${`%${digits}%`} THEN 2
            ELSE 3
          END`
        : cnaeCodes.code,
      cnaeCodes.code,
    )
    .limit(input.limit);

  return rows;
}

export async function ensureCnaeCode(input: EnsureCnaeCodeInput) {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:manage")) {
    throw new ForbiddenError();
  }

  const [row] = await db
    .insert(cnaeCodes)
    .values({
      code: input.code,
      description: input.description,
    })
    .onConflictDoUpdate({
      target: cnaeCodes.code,
      set: { description: input.description },
    })
    .returning({
      code: cnaeCodes.code,
      description: cnaeCodes.description,
    });

  return row!;
}

export async function getCnaeCodeByCode(code: string) {
  return db.query.cnaeCodes.findFirst({
    where: (table, { eq }) => eq(table.code, code),
  });
}
