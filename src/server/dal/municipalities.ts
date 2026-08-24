import "server-only";

import { and, eq, ilike, or, sql } from "drizzle-orm";

import type { MunicipalitySearchInput } from "@/schemas/municipalities";
import { db } from "@/server/db";
import { municipalities } from "@/server/db/schema";
import { ForbiddenError, requireCompanyContext } from "@/server/dal/context";
import { can } from "@/server/policies";

export type MunicipalityRecord = typeof municipalities.$inferSelect;

export async function searchMunicipalities(input: MunicipalitySearchInput) {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:read")) {
    throw new ForbiddenError();
  }

  const q = input.q.trim();
  const digits = q.replace(/\D/g, "");

  const where = digits
    ? or(
        ilike(municipalities.name, `%${q}%`),
        eq(municipalities.ibgeCode, digits),
        ilike(municipalities.uf, q.toUpperCase()),
      )
    : or(ilike(municipalities.name, `%${q}%`), ilike(municipalities.uf, q.toUpperCase()));

  return db
    .select({
      ibgeCode: municipalities.ibgeCode,
      name: municipalities.name,
      uf: municipalities.uf,
      nfseStatus: municipalities.nfseStatus,
    })
    .from(municipalities)
    .where(where)
    .orderBy(municipalities.name)
    .limit(input.limit);
}

export async function getMunicipalityByIbge(ibgeCode: string): Promise<MunicipalityRecord | null> {
  const row = await db.query.municipalities.findFirst({
    where: eq(municipalities.ibgeCode, ibgeCode),
  });

  return row ?? null;
}

export async function setMunicipalityNfseStatus(
  ibgeCode: string,
  nfseStatus: "not_started" | "homologating" | "live",
) {
  const [row] = await db
    .update(municipalities)
    .set({ nfseStatus })
    .where(eq(municipalities.ibgeCode, ibgeCode))
    .returning();

  return row ?? null;
}

export async function markCuiabaLive() {
  return setMunicipalityNfseStatus("5103403", "live");
}

export async function countMunicipalities() {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(municipalities);
  return Number(row?.count ?? 0);
}
