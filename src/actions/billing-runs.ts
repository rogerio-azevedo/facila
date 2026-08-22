"use server";

import { revalidatePath } from "next/cache";

import { parseCompetenceMonth } from "@/lib/billing";
import { getBatchBillingPreview } from "@/modules/billing/preview";
import {
  generateBatchBillingSchema,
  type BillingRunFormState,
} from "@/schemas/billing-runs";
import { createAccountReceivable } from "@/server/dal/accounts-receivable";
import { createBillingRunItems } from "@/server/dal/billing-run-items";
import { createBillingRun, updateBillingRunCounts } from "@/server/dal/billing-runs";
import { requireCompanyContext } from "@/server/dal/context";
import { db } from "@/server/db";

export async function generateBatchBillingAction(
  input: unknown,
): Promise<BillingRunFormState> {
  const parsed = generateBatchBillingSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const preview = await getBatchBillingPreview(parsed.data.competenceMonth);
  const selectedIds = new Set(parsed.data.contractIds ?? []);

  const readyItems = preview.items.filter((item) => {
    if (item.status !== "ready") {
      return false;
    }

    if (selectedIds.size === 0) {
      return true;
    }

    return selectedIds.has(item.contractId);
  });

  if (readyItems.length === 0) {
    return {
      errors: { form: ["Nenhum contrato pronto para faturar"] },
    };
  }

  const ctx = await requireCompanyContext();
  const competenceDate = parseCompetenceMonth(parsed.data.competenceMonth);
  const issueDate = new Date();
  const todayUtc = new Date(
    Date.UTC(issueDate.getUTCFullYear(), issueDate.getUTCMonth(), issueDate.getUTCDate()),
  );

  let generatedCount = 0;
  let errorCount = 0;
  let totalAmount = 0;

  const billingRun = await db.transaction(async (tx) => {
    const run = await createBillingRun(
      {
        competenceDate,
        status: "completed",
        createdByUserId: ctx.userId,
        eligibleCount: readyItems.length,
        generatedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        totalAmount: "0",
        completedAt: undefined,
      },
      tx,
    );

    const runItems: Array<{
      billingRunId: string;
      contractId: string;
      status: "generated" | "skipped" | "error";
      skipReason?: string;
      errorMessage?: string;
      accountReceivableId?: string;
      amount?: string;
      dueDate?: Date;
    }> = [];

    for (const item of readyItems) {
      const dueDate = item.dueDate;

      try {
        const receivable = await createAccountReceivable(
          {
            clientId: item.clientId,
            contractId: item.contractId,
            description: item.contractDescription ?? item.contractName,
            amount: Number(item.amount),
            competenceDate,
            issueDate: todayUtc,
            dueDate,
            billingRunId: run.id,
            notes: undefined,
          },
          tx,
        );

        generatedCount += 1;
        totalAmount += Number(item.amount);

        runItems.push({
          billingRunId: run.id,
          contractId: item.contractId,
          status: "generated",
          accountReceivableId: receivable.id,
          amount: item.amount,
          dueDate,
        });
      } catch (error) {
        errorCount += 1;
        runItems.push({
          billingRunId: run.id,
          contractId: item.contractId,
          status: "error",
          errorMessage:
            error instanceof Error ? error.message : "Erro ao gerar título",
          amount: item.amount,
          dueDate,
        });
      }
    }

    await createBillingRunItems(runItems, tx);

    const finalStatus = errorCount > 0 ? "partial_failed" : "completed";

    await updateBillingRunCounts(
      run.id,
      {
        status: finalStatus,
        generatedCount,
        skippedCount: 0,
        errorCount,
        totalAmount: totalAmount.toFixed(2),
      },
      tx,
    );

    return run;
  });

  revalidatePath("/billing");
  revalidatePath("/accounts-receivable");
  revalidatePath("/clients");
  revalidatePath("/contracts");

  return {
    success: true,
    billingRunId: billingRun.id,
    generatedCount,
    skippedCount: 0,
    errorCount,
  };
}
