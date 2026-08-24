import "server-only";

import { ilike, or } from "drizzle-orm";

import type { ReferenceCodeSearchInput } from "@/schemas/municipalities";
import { db } from "@/server/db";
import { nationalServiceCodes } from "@/server/db/schema";
import { ForbiddenError, requireCompanyContext } from "@/server/dal/context";
import { can } from "@/server/policies";

export async function searchNationalServiceCodes(input: ReferenceCodeSearchInput) {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:read")) {
    throw new ForbiddenError();
  }

  const q = input.q.trim();
  const digits = q.replace(/\D/g, "");

  return db
    .select({
      code: nationalServiceCodes.code,
      description: nationalServiceCodes.description,
      nbsCode: nationalServiceCodes.nbsCode,
    })
    .from(nationalServiceCodes)
    .where(
      digits
        ? or(
            ilike(nationalServiceCodes.code, `%${digits}%`),
            ilike(nationalServiceCodes.description, `%${q}%`),
          )
        : ilike(nationalServiceCodes.description, `%${q}%`),
    )
    .orderBy(nationalServiceCodes.code)
    .limit(input.limit);
}

export async function getNationalServiceCodeByCode(code: string) {
  return db.query.nationalServiceCodes.findFirst({
    where: (table, { eq }) => eq(table.code, code),
  });
}
