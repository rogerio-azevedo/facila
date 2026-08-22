import "server-only";

import { eq } from "drizzle-orm";

import type { BillingRunItemInput } from "@/schemas/billing-run-items";
import { db, type DbTransaction } from "@/server/db";
import { billingRunItems } from "@/server/db/schema";
import { ForbiddenError, requireCompanyContext } from "@/server/dal/context";
import { can } from "@/server/policies";

export type BillingRunItemRecord = typeof billingRunItems.$inferSelect;

function dbOrTx(tx?: DbTransaction) {
  return tx ?? db;
}

export async function listBillingRunItemsByRunId(
  billingRunId: string,
): Promise<BillingRunItemRecord[]> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "billing-runs:read")) {
    throw new ForbiddenError();
  }

  return db.query.billingRunItems.findMany({
    where: eq(billingRunItems.billingRunId, billingRunId),
  });
}

export async function createBillingRunItem(
  input: BillingRunItemInput,
  tx?: DbTransaction,
): Promise<BillingRunItemRecord> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "billing-runs:manage")) {
    throw new ForbiddenError();
  }

  const database = dbOrTx(tx);

  const [row] = await database
    .insert(billingRunItems)
    .values({
      billingRunId: input.billingRunId,
      contractId: input.contractId,
      status: input.status,
      skipReason: input.skipReason,
      errorMessage: input.errorMessage,
      accountReceivableId: input.accountReceivableId,
      amount: input.amount,
      dueDate: input.dueDate,
    })
    .returning();

  return row;
}

export async function createBillingRunItems(
  inputs: BillingRunItemInput[],
  tx?: DbTransaction,
): Promise<BillingRunItemRecord[]> {
  if (inputs.length === 0) {
    return [];
  }

  const ctx = await requireCompanyContext();
  if (!can(ctx, "billing-runs:manage")) {
    throw new ForbiddenError();
  }

  const database = dbOrTx(tx);

  return database
    .insert(billingRunItems)
    .values(
      inputs.map((input) => ({
        billingRunId: input.billingRunId,
        contractId: input.contractId,
        status: input.status,
        skipReason: input.skipReason,
        errorMessage: input.errorMessage,
        accountReceivableId: input.accountReceivableId,
        amount: input.amount,
        dueDate: input.dueDate,
      })),
    )
    .returning();
}
