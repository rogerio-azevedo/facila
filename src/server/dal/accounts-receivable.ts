import "server-only";

import { and, count, desc, eq, inArray, lt, or, sql } from "drizzle-orm";

import { parseCompetenceMonth } from "@/lib/billing";
import type {
  AccountReceivableInput,
  AccountReceivableListQuery,
  AccountReceivableUpdateInput,
  MarkAccountReceivablePaidInput,
} from "@/schemas/accounts-receivable";
import { db, type DbTransaction } from "@/server/db";
import { accountsReceivable } from "@/server/db/schema";
import { ForbiddenError, requireCompanyContext } from "@/server/dal/context";
import { getClientById } from "@/server/dal/clients";
import { getContractById } from "@/server/dal/contracts";
import { can } from "@/server/policies";

export type AccountReceivableListItem = {
  id: string;
  clientId: string;
  contractId: string | null;
  description: string;
  amount: string;
  competenceDate: Date;
  issueDate: Date;
  dueDate: Date;
  status: "pending" | "paid" | "canceled";
  paymentDate: Date | null;
  paymentMethod:
    | "pix"
    | "boleto"
    | "transfer"
    | "cash"
    | "credit_card"
    | "debit_card"
    | "other"
    | null;
};

export type AccountReceivableListResult = {
  items: AccountReceivableListItem[];
  total: number;
};

export type AccountReceivableRecord = typeof accountsReceivable.$inferSelect;

export type CreateAccountReceivableInput = AccountReceivableInput & {
  billingRunId?: string;
};

function dbOrTx(tx?: DbTransaction) {
  return tx ?? db;
}

function buildListWhere(
  companyId: string,
  query: AccountReceivableListQuery,
  contractIds?: string[],
) {
  const conditions = [eq(accountsReceivable.companyId, companyId)];

  if (query.clientId) {
    conditions.push(eq(accountsReceivable.clientId, query.clientId));
  }

  if (query.competenceMonth) {
    const competenceDate = parseCompetenceMonth(query.competenceMonth);
    conditions.push(eq(accountsReceivable.competenceDate, competenceDate));
  }

  if (query.status === "overdue") {
    const today = new Date();
    const todayUtc = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    conditions.push(eq(accountsReceivable.status, "pending"));
    conditions.push(lt(accountsReceivable.dueDate, todayUtc));
  } else if (query.status) {
    conditions.push(eq(accountsReceivable.status, query.status));
  }

  if (contractIds) {
    conditions.push(inArray(accountsReceivable.contractId, contractIds));
  }

  return and(...conditions);
}

export async function listAccountsReceivable(
  query: AccountReceivableListQuery,
  options?: { contractIds?: string[] },
): Promise<AccountReceivableListResult> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "accounts-receivable:read")) {
    throw new ForbiddenError();
  }

  if (options?.contractIds && options.contractIds.length === 0) {
    return { items: [], total: 0 };
  }

  const where = buildListWhere(ctx.companyId, query, options?.contractIds);
  const offset = (query.page - 1) * query.pageSize;

  const [countRow, rows] = await Promise.all([
    db.select({ total: count() }).from(accountsReceivable).where(where),
    db
      .select({
        id: accountsReceivable.id,
        clientId: accountsReceivable.clientId,
        contractId: accountsReceivable.contractId,
        description: accountsReceivable.description,
        amount: accountsReceivable.amount,
        competenceDate: accountsReceivable.competenceDate,
        issueDate: accountsReceivable.issueDate,
        dueDate: accountsReceivable.dueDate,
        status: accountsReceivable.status,
        paymentDate: accountsReceivable.paymentDate,
        paymentMethod: accountsReceivable.paymentMethod,
      })
      .from(accountsReceivable)
      .where(where)
      .orderBy(desc(accountsReceivable.competenceDate), desc(accountsReceivable.createdAt))
      .limit(query.pageSize)
      .offset(offset),
  ]);

  return {
    items: rows,
    total: countRow[0]?.total ?? 0,
  };
}

export async function listAccountsReceivableByClientId(
  clientId: string,
  limit = 10,
): Promise<AccountReceivableListItem[]> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "accounts-receivable:read")) {
    throw new ForbiddenError();
  }

  const client = await getClientById(clientId);
  if (!client) {
    return [];
  }

  return db
    .select({
      id: accountsReceivable.id,
      clientId: accountsReceivable.clientId,
      contractId: accountsReceivable.contractId,
      description: accountsReceivable.description,
      amount: accountsReceivable.amount,
      competenceDate: accountsReceivable.competenceDate,
      issueDate: accountsReceivable.issueDate,
      dueDate: accountsReceivable.dueDate,
      status: accountsReceivable.status,
      paymentDate: accountsReceivable.paymentDate,
      paymentMethod: accountsReceivable.paymentMethod,
    })
    .from(accountsReceivable)
    .where(
      and(
        eq(accountsReceivable.companyId, ctx.companyId),
        eq(accountsReceivable.clientId, clientId),
      ),
    )
    .orderBy(desc(accountsReceivable.competenceDate), desc(accountsReceivable.createdAt))
    .limit(limit);
}

export async function getAccountReceivableById(
  accountReceivableId: string,
): Promise<AccountReceivableRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "accounts-receivable:read")) {
    throw new ForbiddenError();
  }

  const row = await db.query.accountsReceivable.findFirst({
    where: and(
      eq(accountsReceivable.id, accountReceivableId),
      eq(accountsReceivable.companyId, ctx.companyId),
    ),
  });

  return row ?? null;
}

export async function findExistingByContractAndCompetence(
  contractId: string,
  competenceDate: Date,
  tx?: DbTransaction,
): Promise<AccountReceivableRecord | null> {
  const ctx = await requireCompanyContext();
  const database = dbOrTx(tx);

  const row = await database.query.accountsReceivable.findFirst({
    where: and(
      eq(accountsReceivable.companyId, ctx.companyId),
      eq(accountsReceivable.contractId, contractId),
      eq(accountsReceivable.competenceDate, competenceDate),
      or(
        eq(accountsReceivable.status, "pending"),
        eq(accountsReceivable.status, "paid"),
      ),
    ),
  });

  return row ?? null;
}

export async function listExistingByContractIdsAndCompetence(
  contractIds: string[],
  competenceDate: Date,
  tx?: DbTransaction,
): Promise<Array<{ contractId: string | null; id: string }>> {
  if (contractIds.length === 0) {
    return [];
  }

  const ctx = await requireCompanyContext();
  const database = dbOrTx(tx);

  return database
    .select({
      contractId: accountsReceivable.contractId,
      id: accountsReceivable.id,
    })
    .from(accountsReceivable)
    .where(
      and(
        eq(accountsReceivable.companyId, ctx.companyId),
        eq(accountsReceivable.competenceDate, competenceDate),
        inArray(accountsReceivable.contractId, contractIds),
        or(
          eq(accountsReceivable.status, "pending"),
          eq(accountsReceivable.status, "paid"),
        ),
      ),
    );
}

export async function hasAccountsReceivableForContract(
  contractId: string,
): Promise<boolean> {
  const ctx = await requireCompanyContext();

  const row = await db
    .select({ total: count() })
    .from(accountsReceivable)
    .where(
      and(
        eq(accountsReceivable.companyId, ctx.companyId),
        eq(accountsReceivable.contractId, contractId),
      ),
    );

  return (row[0]?.total ?? 0) > 0;
}

export async function createAccountReceivable(
  input: CreateAccountReceivableInput,
  tx?: DbTransaction,
): Promise<AccountReceivableRecord> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "accounts-receivable:manage")) {
    throw new ForbiddenError();
  }

  const client = await getClientById(input.clientId);
  if (!client) {
    throw new Error("client-not-found");
  }

  if (input.contractId) {
    const contract = await getContractById(input.contractId);
    if (!contract || contract.clientId !== input.clientId) {
      throw new Error("contract-not-found");
    }
  }

  const database = dbOrTx(tx);

  const [row] = await database
    .insert(accountsReceivable)
    .values({
      companyId: ctx.companyId,
      clientId: input.clientId,
      contractId: input.contractId,
      billingRunId: input.billingRunId,
      description: input.description,
      amount: input.amount.toFixed(2),
      competenceDate: input.competenceDate,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      notes: input.notes,
    })
    .returning();

  return row;
}

export async function updateAccountReceivable(
  accountReceivableId: string,
  input: AccountReceivableUpdateInput,
  tx?: DbTransaction,
): Promise<AccountReceivableRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "accounts-receivable:manage")) {
    throw new ForbiddenError();
  }

  const existing = await getAccountReceivableById(accountReceivableId);
  if (!existing || existing.status !== "pending") {
    return null;
  }

  const database = dbOrTx(tx);

  const [row] = await database
    .update(accountsReceivable)
    .set({
      description: input.description,
      amount: input.amount.toFixed(2),
      dueDate: input.dueDate,
      notes: input.notes,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(accountsReceivable.id, accountReceivableId),
        eq(accountsReceivable.companyId, ctx.companyId),
        eq(accountsReceivable.status, "pending"),
      ),
    )
    .returning();

  return row ?? null;
}

export async function markAccountReceivableAsPaid(
  accountReceivableId: string,
  input: MarkAccountReceivablePaidInput,
  tx?: DbTransaction,
): Promise<AccountReceivableRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "accounts-receivable:manage")) {
    throw new ForbiddenError();
  }

  const database = dbOrTx(tx);

  const [row] = await database
    .update(accountsReceivable)
    .set({
      status: "paid",
      paymentDate: input.paymentDate,
      paymentMethod: input.paymentMethod,
      notes: input.notes ?? undefined,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(accountsReceivable.id, accountReceivableId),
        eq(accountsReceivable.companyId, ctx.companyId),
        eq(accountsReceivable.status, "pending"),
      ),
    )
    .returning();

  return row ?? null;
}

export async function cancelAccountReceivable(
  accountReceivableId: string,
  tx?: DbTransaction,
): Promise<AccountReceivableRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "accounts-receivable:manage")) {
    throw new ForbiddenError();
  }

  const database = dbOrTx(tx);

  const [row] = await database
    .update(accountsReceivable)
    .set({
      status: "canceled",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(accountsReceivable.id, accountReceivableId),
        eq(accountsReceivable.companyId, ctx.companyId),
        eq(accountsReceivable.status, "pending"),
      ),
    )
    .returning();

  return row ?? null;
}

export async function sumAmountByBillingRunId(
  billingRunId: string,
  tx?: DbTransaction,
): Promise<string> {
  const ctx = await requireCompanyContext();
  const database = dbOrTx(tx);

  const [row] = await database
    .select({
      total: sql<string>`coalesce(sum(${accountsReceivable.amount}), 0)::text`,
    })
    .from(accountsReceivable)
    .where(
      and(
        eq(accountsReceivable.companyId, ctx.companyId),
        eq(accountsReceivable.billingRunId, billingRunId),
      ),
    );

  return row?.total ?? "0";
}
