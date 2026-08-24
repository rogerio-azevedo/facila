import "server-only";

import { and, count, desc, eq, ilike, isNotNull, lte, or, sql } from "drizzle-orm";

import type { IssuerInput, IssuerListQuery, IssuerUpdateInput } from "@/schemas/issuers";
import { db, type DbTransaction } from "@/server/db";
import { cnaeCodes, issuerCnaes, issuers, municipalities } from "@/server/db/schema";
import { ForbiddenError, requireCompanyContext } from "@/server/dal/context";
import { can } from "@/server/policies";

export type IssuerListItem = {
  id: string;
  legalName: string;
  tradeName: string | null;
  cnpj: string;
  codMunicipioIbge: string;
  municipalityName: string;
  municipalityUf: string;
  environment: "homologacao" | "producao";
  status: "active" | "inactive";
  isDefault: boolean;
  certificateExpiresAt: Date | null;
  certificateUploadedAt: Date | null;
  certificateSubjectCn: string | null;
};

export type IssuerListResult = {
  items: IssuerListItem[];
  total: number;
};

export type IssuerRecord = typeof issuers.$inferSelect;

export type IssuerCnaeRecord = typeof issuerCnaes.$inferSelect & {
  description: string | null;
};

export type IssuerDetail = IssuerRecord & {
  cnaes: IssuerCnaeRecord[];
  municipalityName: string;
  municipalityUf: string;
};

function dbOrTx(tx?: DbTransaction) {
  return tx ?? db;
}

function buildListWhere(companyId: string, query: IssuerListQuery) {
  const conditions = [eq(issuers.companyId, companyId)];

  if (query.q) {
    const documentDigits = query.q.replace(/\D/g, "");

    if (documentDigits) {
      conditions.push(
        or(
          ilike(issuers.legalName, `%${query.q}%`),
          ilike(issuers.tradeName, `%${query.q}%`),
          ilike(issuers.cnpj, `%${documentDigits}%`),
        )!,
      );
    } else {
      conditions.push(
        or(
          ilike(issuers.legalName, `%${query.q}%`),
          ilike(issuers.tradeName, `%${query.q}%`),
        )!,
      );
    }
  }

  return and(...conditions);
}

export function isDuplicateIssuerCnpjError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: string }).code === "23505" &&
    error.message.includes("issuers_company_cnpj_idx")
  );
}

export async function listIssuers(query: IssuerListQuery): Promise<IssuerListResult> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:read")) {
    throw new ForbiddenError();
  }

  const where = buildListWhere(ctx.companyId, query);
  const offset = (query.page - 1) * query.pageSize;

  const [items, totalRow] = await Promise.all([
    db
      .select({
        id: issuers.id,
        legalName: issuers.legalName,
        tradeName: issuers.tradeName,
        cnpj: issuers.cnpj,
        codMunicipioIbge: issuers.codMunicipioIbge,
        municipalityName: municipalities.name,
        municipalityUf: municipalities.uf,
        environment: issuers.environment,
        status: issuers.status,
        isDefault: issuers.isDefault,
        certificateExpiresAt: issuers.certificateExpiresAt,
        certificateUploadedAt: issuers.certificateUploadedAt,
        certificateSubjectCn: issuers.certificateSubjectCn,
      })
      .from(issuers)
      .innerJoin(municipalities, eq(issuers.codMunicipioIbge, municipalities.ibgeCode))
      .where(where)
      .orderBy(desc(issuers.isDefault), desc(issuers.createdAt))
      .limit(query.pageSize)
      .offset(offset),
    db.select({ total: count() }).from(issuers).where(where),
  ]);

  return {
    items,
    total: totalRow[0]?.total ?? 0,
  };
}

export async function getIssuerById(id: string): Promise<IssuerDetail | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:read")) {
    throw new ForbiddenError();
  }

  const row = await db.query.issuers.findFirst({
    where: and(eq(issuers.id, id), eq(issuers.companyId, ctx.companyId)),
  });

  if (!row) {
    return null;
  }

  const [municipality, cnaes] = await Promise.all([
    db.query.municipalities.findFirst({
      where: eq(municipalities.ibgeCode, row.codMunicipioIbge),
    }),
    db
      .select({
        issuerId: issuerCnaes.issuerId,
        cnaeCode: issuerCnaes.cnaeCode,
        isPrimary: issuerCnaes.isPrimary,
        description: cnaeCodes.description,
      })
      .from(issuerCnaes)
      .leftJoin(cnaeCodes, eq(issuerCnaes.cnaeCode, cnaeCodes.code))
      .where(eq(issuerCnaes.issuerId, row.id)),
  ]);

  return {
    ...row,
    cnaes,
    municipalityName: municipality?.name ?? "",
    municipalityUf: municipality?.uf ?? "",
  };
}

export async function getDefaultIssuer(): Promise<IssuerRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:read")) {
    throw new ForbiddenError();
  }

  const row = await db.query.issuers.findFirst({
    where: and(
      eq(issuers.companyId, ctx.companyId),
      eq(issuers.isDefault, true),
      eq(issuers.status, "active"),
    ),
  });

  return row ?? null;
}

export async function ensureIssuerCnae(
  issuerId: string,
  cnaeCode: string,
  options: { isPrimary?: boolean } = {},
  tx?: DbTransaction,
) {
  const run = async (innerTx: DbTransaction) => {
    const existing = await innerTx.query.issuerCnaes.findFirst({
      where: and(eq(issuerCnaes.issuerId, issuerId), eq(issuerCnaes.cnaeCode, cnaeCode)),
    });

    if (!existing) {
      const [countRow] = await innerTx
        .select({ value: count() })
        .from(issuerCnaes)
        .where(eq(issuerCnaes.issuerId, issuerId));
      const isFirst = Number(countRow?.value ?? 0) === 0;

      await innerTx.insert(issuerCnaes).values({
        issuerId,
        cnaeCode,
        isPrimary: options.isPrimary ?? isFirst,
      });
    }

    if (options.isPrimary) {
      await innerTx
        .update(issuerCnaes)
        .set({ isPrimary: false })
        .where(eq(issuerCnaes.issuerId, issuerId));
      await innerTx
        .update(issuerCnaes)
        .set({ isPrimary: true })
        .where(and(eq(issuerCnaes.issuerId, issuerId), eq(issuerCnaes.cnaeCode, cnaeCode)));
    }
  };

  if (tx) {
    await run(tx);
    return;
  }

  await db.transaction(run);
}

async function syncIssuerCnaes(
  issuerId: string,
  cnaes: IssuerInput["cnaes"],
  tx: DbTransaction,
) {
  await tx.delete(issuerCnaes).where(eq(issuerCnaes.issuerId, issuerId));

  if (cnaes.length === 0) {
    return;
  }

  await tx.insert(issuerCnaes).values(
    cnaes.map((item) => ({
      issuerId,
      cnaeCode: item.code,
      isPrimary: item.isPrimary,
    })),
  );
}

async function clearOtherDefaultIssuers(companyId: string, exceptId: string, tx: DbTransaction) {
  await tx
    .update(issuers)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(and(eq(issuers.companyId, companyId), sql`${issuers.id} <> ${exceptId}`));
}

export async function createIssuer(
  input: IssuerInput,
  tx?: DbTransaction,
): Promise<IssuerRecord> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:manage")) {
    throw new ForbiddenError();
  }

  const database = dbOrTx(tx);

  const run = async (innerTx: DbTransaction) => {
    if (input.isDefault) {
      await innerTx
        .update(issuers)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(issuers.companyId, ctx.companyId));
    }

    const [row] = await innerTx
      .insert(issuers)
      .values({
        companyId: ctx.companyId,
        legalName: input.legalName,
        tradeName: input.tradeName,
        cnpj: input.cnpj,
        municipalRegistration: input.municipalRegistration,
        stateRegistration: input.stateRegistration,
        codMunicipioIbge: input.codMunicipioIbge,
        email: input.email,
        phone: input.phone,
        opSimpNac: input.opSimpNac,
        regApTribSn: input.regApTribSn,
        regEspTrib: input.regEspTrib,
        incentivadorCultural: input.incentivadorCultural,
        dpsSeries: input.dpsSeries,
        nextDpsNumber: input.nextDpsNumber,
        environment: input.environment,
        status: input.status,
        isDefault: input.isDefault,
      })
      .returning();

    await syncIssuerCnaes(row!.id, input.cnaes, innerTx);
    return row!;
  };

  if (tx) {
    return run(tx);
  }

  return db.transaction(run);
}

export async function updateIssuer(
  id: string,
  input: IssuerUpdateInput,
  tx?: DbTransaction,
): Promise<IssuerRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:manage")) {
    throw new ForbiddenError();
  }

  const database = dbOrTx(tx);

  const run = async (innerTx: DbTransaction) => {
    const existing = await innerTx.query.issuers.findFirst({
      where: and(eq(issuers.id, id), eq(issuers.companyId, ctx.companyId)),
    });

    if (!existing) {
      return null;
    }

    if (input.isDefault) {
      await clearOtherDefaultIssuers(ctx.companyId, id, innerTx);
    }

    const [row] = await innerTx
      .update(issuers)
      .set({
        legalName: input.legalName,
        tradeName: input.tradeName,
        cnpj: input.cnpj,
        municipalRegistration: input.municipalRegistration,
        stateRegistration: input.stateRegistration,
        codMunicipioIbge: input.codMunicipioIbge,
        email: input.email,
        phone: input.phone,
        opSimpNac: input.opSimpNac,
        regApTribSn: input.regApTribSn,
        regEspTrib: input.regEspTrib,
        incentivadorCultural: input.incentivadorCultural,
        dpsSeries: input.dpsSeries,
        nextDpsNumber: input.nextDpsNumber,
        environment: input.environment,
        status: input.status,
        isDefault: input.isDefault,
        updatedAt: new Date(),
      })
      .where(eq(issuers.id, id))
      .returning();

    return row!;
  };

  if (tx) {
    return run(tx);
  }

  return db.transaction(run);
}

export async function updateIssuerCertificateMeta(
  id: string,
  meta: {
    certificateFileKey: string;
    certificateFileName: string;
    certificateUploadedAt: Date;
    certificateExpiresAt: Date;
    certificateSubjectCn: string;
    certificatePasswordCiphertext: string;
  },
): Promise<IssuerRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:manage")) {
    throw new ForbiddenError();
  }

  const [row] = await db
    .update(issuers)
    .set({
      ...meta,
      updatedAt: new Date(),
    })
    .where(and(eq(issuers.id, id), eq(issuers.companyId, ctx.companyId)))
    .returning();

  return row ?? null;
}

export async function clearIssuerCertificate(id: string): Promise<IssuerRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:manage")) {
    throw new ForbiddenError();
  }

  const [row] = await db
    .update(issuers)
    .set({
      certificateFileKey: null,
      certificateFileName: null,
      certificateUploadedAt: null,
      certificateExpiresAt: null,
      certificateSubjectCn: null,
      certificatePasswordCiphertext: null,
      updatedAt: new Date(),
    })
    .where(and(eq(issuers.id, id), eq(issuers.companyId, ctx.companyId)))
    .returning();

  return row ?? null;
}

export async function reserveNextDpsNumber(issuerId: string, tx?: DbTransaction): Promise<number> {
  const database = dbOrTx(tx);

  const result = await database.execute<{ next_dps_number: number }>(sql`
    UPDATE issuers
    SET next_dps_number = next_dps_number + 1
    WHERE id = ${issuerId}
    RETURNING (next_dps_number - 1) AS next_dps_number
  `);

  const row = result[0] as { next_dps_number: number } | undefined;

  if (!row) {
    throw new Error("issuer-not-found");
  }

  return Number(row.next_dps_number);
}

export async function releaseReservedDpsNumber(
  issuerId: string,
  reservedNumber: number,
  tx?: DbTransaction,
): Promise<void> {
  const database = dbOrTx(tx);

  await database.execute(sql`
    UPDATE issuers
    SET next_dps_number = next_dps_number - 1
    WHERE id = ${issuerId}
      AND next_dps_number = ${reservedNumber + 1}
  `);
}

export async function updateIssuerEnvironment(
  id: string,
  environment: "homologacao" | "producao",
): Promise<IssuerRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:manage")) {
    throw new ForbiddenError();
  }

  const [row] = await db
    .update(issuers)
    .set({ environment, updatedAt: new Date() })
    .where(and(eq(issuers.id, id), eq(issuers.companyId, ctx.companyId)))
    .returning();

  return row ?? null;
}

export async function listIssuersExpiringCertificates(
  withinDays = 30,
): Promise<Array<{ id: string; legalName: string; certificateExpiresAt: Date | null }>> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "issuers:read")) {
    throw new ForbiddenError();
  }

  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() + withinDays);

  return db
    .select({
      id: issuers.id,
      legalName: issuers.legalName,
      certificateExpiresAt: issuers.certificateExpiresAt,
    })
    .from(issuers)
    .where(
      and(
        eq(issuers.companyId, ctx.companyId),
        isNotNull(issuers.certificateExpiresAt),
        lte(issuers.certificateExpiresAt, limitDate),
      ),
    );
}
