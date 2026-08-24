import "server-only";

import { and, desc, eq } from "drizzle-orm";

import type { IssuerServiceProfileInput } from "@/schemas/issuer-service-profiles";
import { db, type DbTransaction } from "@/server/db";
import { cnaeCodes, issuerServiceProfiles } from "@/server/db/schema";
import { ForbiddenError, requireCompanyContext } from "@/server/dal/context";
import { getIssuerById } from "@/server/dal/issuers";
import { can } from "@/server/policies";

export type IssuerServiceProfileRecord = typeof issuerServiceProfiles.$inferSelect;

export type IssuerServiceProfileListItem = IssuerServiceProfileRecord & {
  cnaeDescription: string | null;
};

function mapProfileInput(input: IssuerServiceProfileInput) {
  return {
    name: input.name,
    description: input.description,
    cnaeCode: input.cnaeCode,
    nationalServiceCode: input.nationalServiceCode,
    issRate: input.issRate.toFixed(4),
    issRetained: input.issRetained,
    issqnCst: input.issqnCst,
    municipalTaxCode: input.municipalTaxCode ?? null,
    nbsCode: input.nbsCode ?? null,
    pTotTribSn:
      input.pTotTribSn === undefined ? null : input.pTotTribSn.toFixed(4),
    cClassTrib: input.cClassTrib ?? null,
    cIndOp: input.cIndOp ?? null,
    indDest: input.indDest ?? null,
    finNfse: input.finNfse ?? null,
    indFinal: input.indFinal ?? null,
    isDefault: input.isDefault,
  };
}

async function assertIssuerAccess(issuerId: string) {
  const issuer = await getIssuerById(issuerId);
  if (!issuer) {
    throw new Error("issuer-not-found");
  }
  return issuer;
}

async function clearDefaultProfiles(issuerId: string, tx: DbTransaction) {
  await tx
    .update(issuerServiceProfiles)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(issuerServiceProfiles.issuerId, issuerId));
}

export async function listIssuerServiceProfiles(
  issuerId: string,
): Promise<IssuerServiceProfileListItem[]> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:read")) {
    throw new ForbiddenError();
  }

  await assertIssuerAccess(issuerId);

  const rows = await db
    .select({
      profile: issuerServiceProfiles,
      cnaeDescription: cnaeCodes.description,
    })
    .from(issuerServiceProfiles)
    .leftJoin(cnaeCodes, eq(issuerServiceProfiles.cnaeCode, cnaeCodes.code))
    .where(eq(issuerServiceProfiles.issuerId, issuerId))
    .orderBy(desc(issuerServiceProfiles.isDefault), desc(issuerServiceProfiles.createdAt));

  return rows.map((row) => ({
    ...row.profile,
    cnaeDescription: row.cnaeDescription,
  }));
}

export async function getIssuerServiceProfileById(
  id: string,
): Promise<IssuerServiceProfileRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:read")) {
    throw new ForbiddenError();
  }

  const row = await db.query.issuerServiceProfiles.findFirst({
    where: eq(issuerServiceProfiles.id, id),
  });

  if (!row) {
    return null;
  }

  await assertIssuerAccess(row.issuerId);
  return row;
}

export async function getDefaultIssuerServiceProfile(
  issuerId: string,
): Promise<IssuerServiceProfileRecord | null> {
  await assertIssuerAccess(issuerId);

  const row = await db.query.issuerServiceProfiles.findFirst({
    where: and(
      eq(issuerServiceProfiles.issuerId, issuerId),
      eq(issuerServiceProfiles.isDefault, true),
    ),
  });

  return row ?? null;
}

export async function createIssuerServiceProfile(
  issuerId: string,
  input: IssuerServiceProfileInput,
  existingTx?: DbTransaction,
): Promise<IssuerServiceProfileRecord> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:manage")) {
    throw new ForbiddenError();
  }

  if (!existingTx) {
    await assertIssuerAccess(issuerId);
  }

  const execute = async (tx: DbTransaction) => {
    if (input.isDefault) {
      await clearDefaultProfiles(issuerId, tx);
    }

    const [row] = await tx
      .insert(issuerServiceProfiles)
      .values({
        issuerId,
        ...mapProfileInput(input),
      })
      .returning();

    return row!;
  };

  if (existingTx) {
    return execute(existingTx);
  }

  return db.transaction(execute);
}

export async function updateIssuerServiceProfile(
  id: string,
  input: IssuerServiceProfileInput,
): Promise<IssuerServiceProfileRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:manage")) {
    throw new ForbiddenError();
  }

  const existing = await getIssuerServiceProfileById(id);
  if (!existing) {
    return null;
  }

  return db.transaction(async (tx) => {
    if (input.isDefault) {
      await clearDefaultProfiles(existing.issuerId, tx);
    }

    const [row] = await tx
      .update(issuerServiceProfiles)
      .set({
        ...mapProfileInput(input),
        updatedAt: new Date(),
      })
      .where(eq(issuerServiceProfiles.id, id))
      .returning();

    return row ?? null;
  });
}

export async function setDefaultIssuerServiceProfile(
  issuerId: string,
  profileId: string,
): Promise<boolean> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:manage")) {
    throw new ForbiddenError();
  }

  await assertIssuerAccess(issuerId);

  const existing = await getIssuerServiceProfileById(profileId);
  if (!existing || existing.issuerId !== issuerId) {
    return false;
  }

  await db.transaction(async (tx) => {
    await clearDefaultProfiles(issuerId, tx);
    await tx
      .update(issuerServiceProfiles)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(issuerServiceProfiles.id, profileId));
  });

  return true;
}

export async function deleteIssuerServiceProfile(id: string): Promise<boolean> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:manage")) {
    throw new ForbiddenError();
  }

  const existing = await getIssuerServiceProfileById(id);
  if (!existing) {
    return false;
  }

  await db.delete(issuerServiceProfiles).where(eq(issuerServiceProfiles.id, id));
  return true;
}
