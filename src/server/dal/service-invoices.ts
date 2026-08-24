import "server-only";

import { and, count, desc, eq, inArray } from "drizzle-orm";

import type { ServiceInvoiceListQuery } from "@/schemas/service-invoices";
import { db, type DbTransaction } from "@/server/db";
import { serviceInvoices } from "@/server/db/schema";
import { ForbiddenError, requireCompanyContext } from "@/server/dal/context";
import { can } from "@/server/policies";

export type ServiceInvoiceRecord = typeof serviceInvoices.$inferSelect;

export type ServiceInvoiceListItem = {
  id: string;
  issuerId: string;
  accountReceivableId: string;
  dpsSeries: string;
  dpsNumber: number;
  environment: ServiceInvoiceRecord["environment"];
  status: ServiceInvoiceRecord["status"];
  accessKey: string | null;
  authorizedAt: Date | null;
  createdAt: Date;
};

export type ServiceInvoiceListResult = {
  items: ServiceInvoiceListItem[];
  total: number;
};

export type CreateServiceInvoiceInput = {
  companyId: string;
  issuerId: string;
  accountReceivableId: string;
  issuerServiceProfileId: string;
  dpsSeries: string;
  dpsNumber: number;
  environment: "homologacao" | "producao";
};

export type UpdateServiceInvoiceInput = Partial<{
  status: ServiceInvoiceRecord["status"];
  accessKey: string | null;
  dpsXmlKey: string | null;
  nfseXmlKey: string | null;
  danfseKey: string | null;
  rejectionReason: string | null;
  authorizedAt: Date | null;
  canceledAt: Date | null;
  cancelReason: string | null;
}>;

function dbOrTx(tx?: DbTransaction) {
  return tx ?? db;
}

export async function createServiceInvoice(
  input: CreateServiceInvoiceInput,
  tx?: DbTransaction,
): Promise<ServiceInvoiceRecord> {
  const database = dbOrTx(tx);

  const [row] = await database
    .insert(serviceInvoices)
    .values({
      companyId: input.companyId,
      issuerId: input.issuerId,
      accountReceivableId: input.accountReceivableId,
      issuerServiceProfileId: input.issuerServiceProfileId,
      dpsSeries: input.dpsSeries,
      dpsNumber: input.dpsNumber,
      environment: input.environment,
      status: "pending",
    })
    .returning();

  return row!;
}

export async function updateServiceInvoice(
  id: string,
  input: UpdateServiceInvoiceInput,
  tx?: DbTransaction,
): Promise<ServiceInvoiceRecord | null> {
  const database = dbOrTx(tx);

  const [row] = await database
    .update(serviceInvoices)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(serviceInvoices.id, id))
    .returning();

  return row ?? null;
}

function buildListWhere(
  companyId: string,
  query: ServiceInvoiceListQuery,
  accountReceivableIds?: string[],
) {
  const conditions = [eq(serviceInvoices.companyId, companyId)];

  if (query.status) {
    conditions.push(eq(serviceInvoices.status, query.status));
  }

  if (query.environment) {
    conditions.push(eq(serviceInvoices.environment, query.environment));
  }

  if (query.issuerId) {
    conditions.push(eq(serviceInvoices.issuerId, query.issuerId));
  }

  if (accountReceivableIds) {
    conditions.push(inArray(serviceInvoices.accountReceivableId, accountReceivableIds));
  }

  return and(...conditions);
}

export async function listServiceInvoices(
  query: ServiceInvoiceListQuery,
  options?: { accountReceivableIds?: string[] },
): Promise<ServiceInvoiceListResult> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "accounts-receivable:read")) {
    throw new ForbiddenError();
  }

  if (options?.accountReceivableIds && options.accountReceivableIds.length === 0) {
    return { items: [], total: 0 };
  }

  const where = buildListWhere(ctx.companyId, query, options?.accountReceivableIds);
  const offset = (query.page - 1) * query.pageSize;

  const [countRow, rows] = await Promise.all([
    db.select({ total: count() }).from(serviceInvoices).where(where),
    db
      .select({
        id: serviceInvoices.id,
        issuerId: serviceInvoices.issuerId,
        accountReceivableId: serviceInvoices.accountReceivableId,
        dpsSeries: serviceInvoices.dpsSeries,
        dpsNumber: serviceInvoices.dpsNumber,
        environment: serviceInvoices.environment,
        status: serviceInvoices.status,
        accessKey: serviceInvoices.accessKey,
        authorizedAt: serviceInvoices.authorizedAt,
        createdAt: serviceInvoices.createdAt,
      })
      .from(serviceInvoices)
      .where(where)
      .orderBy(desc(serviceInvoices.createdAt))
      .limit(query.pageSize)
      .offset(offset),
  ]);

  return {
    items: rows,
    total: countRow[0]?.total ?? 0,
  };
}

export async function getServiceInvoiceById(id: string): Promise<ServiceInvoiceRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "accounts-receivable:read")) {
    throw new ForbiddenError();
  }

  const row = await db.query.serviceInvoices.findFirst({
    where: and(eq(serviceInvoices.id, id), eq(serviceInvoices.companyId, ctx.companyId)),
  });

  return row ?? null;
}

export async function getActiveServiceInvoiceForAccountReceivable(
  accountReceivableId: string,
): Promise<ServiceInvoiceRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "accounts-receivable:read")) {
    throw new ForbiddenError();
  }

  const row = await db.query.serviceInvoices.findFirst({
    where: and(
      eq(serviceInvoices.companyId, ctx.companyId),
      eq(serviceInvoices.accountReceivableId, accountReceivableId),
      eq(serviceInvoices.status, "authorized"),
    ),
    orderBy: [desc(serviceInvoices.createdAt)],
  });

  return row ?? null;
}

export async function listServiceInvoicesByAccountReceivable(
  accountReceivableId: string,
): Promise<ServiceInvoiceRecord[]> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "accounts-receivable:read")) {
    throw new ForbiddenError();
  }

  return db.query.serviceInvoices.findMany({
    where: and(
      eq(serviceInvoices.companyId, ctx.companyId),
      eq(serviceInvoices.accountReceivableId, accountReceivableId),
    ),
    orderBy: [desc(serviceInvoices.createdAt)],
  });
}

export const NFSE_PERSIST_FAILED_PREFIX = "PERSIST_FAILED:";

export function buildPersistFailedReason(payload: Record<string, unknown>) {
  return `${NFSE_PERSIST_FAILED_PREFIX}${JSON.stringify(payload)}`;
}

export function parsePersistFailedReason(reason: string | null | undefined) {
  if (!reason?.startsWith(NFSE_PERSIST_FAILED_PREFIX)) {
    return null;
  }

  try {
    return JSON.parse(reason.slice(NFSE_PERSIST_FAILED_PREFIX.length)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
