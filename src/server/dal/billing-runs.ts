import "server-only";

import { and, desc, eq } from "drizzle-orm";

import type { BillingRunInput } from "@/schemas/billing-runs";
import { db, type DbTransaction } from "@/server/db";
import { billingRuns } from "@/server/db/schema";
import { ForbiddenError, requireCompanyContext } from "@/server/dal/context";
import { can } from "@/server/policies";

export type BillingRunRecord = typeof billingRuns.$inferSelect;

export type BillingRunListItem = {
  id: string;
  competenceDate: Date;
  status: "completed" | "partial_failed";
  eligibleCount: number;
  generatedCount: number;
  skippedCount: number;
  errorCount: number;
  totalAmount: string;
  createdAt: Date;
  completedAt: Date | null;
};

function dbOrTx(tx?: DbTransaction) {
  return tx ?? db;
}

export async function listBillingRuns(limit = 10): Promise<BillingRunListItem[]> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "billing-runs:read")) {
    throw new ForbiddenError();
  }

  return db
    .select({
      id: billingRuns.id,
      competenceDate: billingRuns.competenceDate,
      status: billingRuns.status,
      eligibleCount: billingRuns.eligibleCount,
      generatedCount: billingRuns.generatedCount,
      skippedCount: billingRuns.skippedCount,
      errorCount: billingRuns.errorCount,
      totalAmount: billingRuns.totalAmount,
      createdAt: billingRuns.createdAt,
      completedAt: billingRuns.completedAt,
    })
    .from(billingRuns)
    .where(eq(billingRuns.companyId, ctx.companyId))
    .orderBy(desc(billingRuns.createdAt))
    .limit(limit);
}

export async function getBillingRunById(billingRunId: string): Promise<BillingRunRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "billing-runs:read")) {
    throw new ForbiddenError();
  }

  const row = await db.query.billingRuns.findFirst({
    where: and(eq(billingRuns.id, billingRunId), eq(billingRuns.companyId, ctx.companyId)),
  });

  return row ?? null;
}

export async function createBillingRun(
  input: Omit<BillingRunInput, "companyId">,
  tx?: DbTransaction,
): Promise<BillingRunRecord> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "billing-runs:manage")) {
    throw new ForbiddenError();
  }

  const database = dbOrTx(tx);

  const [row] = await database
    .insert(billingRuns)
    .values({
      companyId: ctx.companyId,
      competenceDate: input.competenceDate,
      status: input.status,
      createdByUserId: input.createdByUserId,
      eligibleCount: input.eligibleCount,
      generatedCount: input.generatedCount,
      skippedCount: input.skippedCount,
      errorCount: input.errorCount,
      totalAmount: input.totalAmount,
      completedAt: input.completedAt,
    })
    .returning();

  return row;
}

export async function updateBillingRunCounts(
  billingRunId: string,
  input: {
    status: "completed" | "partial_failed";
    generatedCount: number;
    skippedCount: number;
    errorCount: number;
    totalAmount: string;
  },
  tx?: DbTransaction,
): Promise<BillingRunRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "billing-runs:manage")) {
    throw new ForbiddenError();
  }

  const database = dbOrTx(tx);

  const [row] = await database
    .update(billingRuns)
    .set({
      status: input.status,
      generatedCount: input.generatedCount,
      skippedCount: input.skippedCount,
      errorCount: input.errorCount,
      totalAmount: input.totalAmount,
      completedAt: new Date(),
    })
    .where(and(eq(billingRuns.id, billingRunId), eq(billingRuns.companyId, ctx.companyId)))
    .returning();

  return row ?? null;
}
