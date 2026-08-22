import "server-only";

import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import type { ContractInput, ContractListQuery } from "@/schemas/contracts";
import { db, type DbTransaction } from "@/server/db";
import { contracts } from "@/server/db/schema";
import { ForbiddenError, requireCompanyContext } from "@/server/dal/context";
import { getClientById } from "@/server/dal/clients";
import { can } from "@/server/policies";

export type ContractListItem = {
  id: string;
  clientId: string;
  name: string;
  amount: string;
  status: "active" | "inactive" | "suspended";
  dueDay: number;
  startDate: Date;
  endDate: Date | null;
  fileName: string | null;
  fileUploadedAt: Date | null;
};

export type ContractListResult = {
  items: ContractListItem[];
  total: number;
};

export type ContractRecord = typeof contracts.$inferSelect;

export type ActiveContractForBilling = {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  amount: string;
  dueDay: number;
  startDate: Date;
  endDate: Date | null;
};

export type ContractSummary = {
  id: string;
  name: string;
};

export type ActiveContractStats = {
  clientId: string;
  activeCount: number;
  monthlyAmount: string;
};

export type ContractFileMetaInput = {
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileMime: string;
};

function dbOrTx(tx?: DbTransaction) {
  return tx ?? db;
}

function buildListWhere(companyId: string, query: ContractListQuery) {
  const conditions = [eq(contracts.companyId, companyId)];

  if (query.status) {
    conditions.push(eq(contracts.status, query.status));
  }

  if (query.clientId) {
    conditions.push(eq(contracts.clientId, query.clientId));
  }

  if (query.q) {
    conditions.push(
      or(
        ilike(contracts.name, `%${query.q}%`),
        ilike(contracts.description, `%${query.q}%`),
      )!,
    );
  }

  return and(...conditions);
}

export async function listContracts(query: ContractListQuery): Promise<ContractListResult> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "contracts:read")) {
    throw new ForbiddenError();
  }

  const where = buildListWhere(ctx.companyId, query);
  const offset = (query.page - 1) * query.pageSize;

  const [countRow, rows] = await Promise.all([
    db.select({ total: count() }).from(contracts).where(where),
    db
      .select({
        id: contracts.id,
        clientId: contracts.clientId,
        name: contracts.name,
        amount: contracts.amount,
        status: contracts.status,
        dueDay: contracts.dueDay,
        startDate: contracts.startDate,
        endDate: contracts.endDate,
        fileName: contracts.fileName,
        fileUploadedAt: contracts.fileUploadedAt,
      })
      .from(contracts)
      .where(where)
      .orderBy(desc(contracts.createdAt))
      .limit(query.pageSize)
      .offset(offset),
  ]);

  return {
    items: rows,
    total: countRow[0]?.total ?? 0,
  };
}

export async function listContractsByClientId(clientId: string): Promise<ContractListItem[]> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "contracts:read")) {
    throw new ForbiddenError();
  }

  const client = await getClientById(clientId);
  if (!client) {
    return [];
  }

  return db
    .select({
      id: contracts.id,
      clientId: contracts.clientId,
      name: contracts.name,
      amount: contracts.amount,
      status: contracts.status,
      dueDay: contracts.dueDay,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
      fileName: contracts.fileName,
      fileUploadedAt: contracts.fileUploadedAt,
    })
    .from(contracts)
    .where(and(eq(contracts.companyId, ctx.companyId), eq(contracts.clientId, clientId)))
    .orderBy(desc(contracts.createdAt));
}

export async function listActiveContractStatsByClientIds(
  clientIds: string[],
): Promise<ActiveContractStats[]> {
  if (clientIds.length === 0) {
    return [];
  }

  const ctx = await requireCompanyContext();
  if (!can(ctx, "contracts:read")) {
    throw new ForbiddenError();
  }

  const rows = await db
    .select({
      clientId: contracts.clientId,
      activeCount: count(),
      monthlyAmount: sql<string>`coalesce(sum(${contracts.amount}), 0)::text`,
    })
    .from(contracts)
    .where(
      and(
        eq(contracts.companyId, ctx.companyId),
        eq(contracts.status, "active"),
        inArray(contracts.clientId, clientIds),
      ),
    )
    .groupBy(contracts.clientId);

  return rows.map((row) => ({
    clientId: row.clientId,
    activeCount: Number(row.activeCount),
    monthlyAmount: row.monthlyAmount,
  }));
}

export async function listActiveContractsForBilling(): Promise<ActiveContractForBilling[]> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "contracts:read")) {
    throw new ForbiddenError();
  }

  return db
    .select({
      id: contracts.id,
      clientId: contracts.clientId,
      name: contracts.name,
      description: contracts.description,
      amount: contracts.amount,
      dueDay: contracts.dueDay,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
    })
    .from(contracts)
    .where(and(eq(contracts.companyId, ctx.companyId), eq(contracts.status, "active")))
    .orderBy(contracts.name);
}

export async function listContractOptions(): Promise<ActiveContractForBilling[]> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "contracts:read")) {
    throw new ForbiddenError();
  }

  return db
    .select({
      id: contracts.id,
      clientId: contracts.clientId,
      name: contracts.name,
      description: contracts.description,
      amount: contracts.amount,
      dueDay: contracts.dueDay,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
    })
    .from(contracts)
    .where(eq(contracts.companyId, ctx.companyId))
    .orderBy(contracts.name);
}

export async function listContractSummariesByIds(
  contractIds: string[],
): Promise<ContractSummary[]> {
  if (contractIds.length === 0) {
    return [];
  }

  const ctx = await requireCompanyContext();
  if (!can(ctx, "contracts:read")) {
    throw new ForbiddenError();
  }

  return db
    .select({
      id: contracts.id,
      name: contracts.name,
    })
    .from(contracts)
    .where(
      and(eq(contracts.companyId, ctx.companyId), inArray(contracts.id, contractIds)),
    );
}

export async function listContractIdsByNameSearch(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const ctx = await requireCompanyContext();
  if (!can(ctx, "contracts:read")) {
    throw new ForbiddenError();
  }

  const rows = await db
    .select({ id: contracts.id })
    .from(contracts)
    .where(
      and(eq(contracts.companyId, ctx.companyId), ilike(contracts.name, `%${trimmed}%`)),
    );

  return rows.map((row) => row.id);
}

export async function getContractById(contractId: string): Promise<ContractRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "contracts:read")) {
    throw new ForbiddenError();
  }

  const row = await db.query.contracts.findFirst({
    where: and(eq(contracts.id, contractId), eq(contracts.companyId, ctx.companyId)),
  });

  return row ?? null;
}

export async function createContract(
  input: ContractInput,
  tx?: DbTransaction,
): Promise<ContractRecord> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "contracts:manage")) {
    throw new ForbiddenError();
  }

  const client = await getClientById(input.clientId);
  if (!client) {
    throw new Error("client-not-found");
  }

  const database = dbOrTx(tx);

  const [row] = await database
    .insert(contracts)
    .values({
      companyId: ctx.companyId,
      clientId: input.clientId,
      name: input.name,
      description: input.description,
      amount: input.amount.toFixed(2),
      startDate: input.startDate,
      endDate: input.endDate,
      termMonths: input.termMonths,
      dueDay: input.dueDay,
      readjustmentIndex: input.readjustmentIndex,
      readjustmentMonth: input.readjustmentMonth,
      status: input.status,
    })
    .returning();

  return row;
}

export async function updateContract(
  contractId: string,
  input: ContractInput,
  tx?: DbTransaction,
): Promise<ContractRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "contracts:manage")) {
    throw new ForbiddenError();
  }

  const client = await getClientById(input.clientId);
  if (!client) {
    throw new Error("client-not-found");
  }

  const database = dbOrTx(tx);

  const [row] = await database
    .update(contracts)
    .set({
      clientId: input.clientId,
      name: input.name,
      description: input.description,
      amount: input.amount.toFixed(2),
      startDate: input.startDate,
      endDate: input.endDate,
      termMonths: input.termMonths,
      dueDay: input.dueDay,
      readjustmentIndex: input.readjustmentIndex,
      readjustmentMonth: input.readjustmentMonth,
      status: input.status,
      updatedAt: new Date(),
    })
    .where(and(eq(contracts.id, contractId), eq(contracts.companyId, ctx.companyId)))
    .returning();

  return row ?? null;
}

export async function deleteContract(
  contractId: string,
  tx?: DbTransaction,
): Promise<ContractRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "contracts:manage")) {
    throw new ForbiddenError();
  }

  const database = dbOrTx(tx);

  const [row] = await database
    .delete(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.companyId, ctx.companyId)))
    .returning();

  return row ?? null;
}

export async function updateContractFileMeta(
  contractId: string,
  meta: ContractFileMetaInput,
  tx?: DbTransaction,
): Promise<ContractRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "contracts:manage")) {
    throw new ForbiddenError();
  }

  const database = dbOrTx(tx);

  const [row] = await database
    .update(contracts)
    .set({
      fileKey: meta.fileKey,
      fileName: meta.fileName,
      fileSize: meta.fileSize,
      fileMime: meta.fileMime,
      fileUploadedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(contracts.id, contractId), eq(contracts.companyId, ctx.companyId)))
    .returning();

  return row ?? null;
}

export async function clearContractFileMeta(
  contractId: string,
  tx?: DbTransaction,
): Promise<ContractRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "contracts:manage")) {
    throw new ForbiddenError();
  }

  const database = dbOrTx(tx);

  const [row] = await database
    .update(contracts)
    .set({
      fileKey: null,
      fileName: null,
      fileSize: null,
      fileMime: null,
      fileUploadedAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(contracts.id, contractId), eq(contracts.companyId, ctx.companyId)))
    .returning();

  return row ?? null;
}
