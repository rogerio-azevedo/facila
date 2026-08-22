"use server";

import { revalidatePath } from "next/cache";

import {
  accountReceivableSchema,
  accountReceivableUpdateSchema,
  markAccountReceivablePaidSchema,
  type AccountReceivableFormState,
} from "@/schemas/accounts-receivable";
import {
  cancelAccountReceivable,
  createAccountReceivable,
  getAccountReceivableById,
  markAccountReceivableAsPaid,
  updateAccountReceivable,
} from "@/server/dal/accounts-receivable";

export async function createAccountReceivableAction(
  input: unknown,
): Promise<AccountReceivableFormState> {
  const parsed = accountReceivableSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const row = await createAccountReceivable(parsed.data);
    revalidatePath("/accounts-receivable");
    revalidatePath("/clients");
    return { success: true, accountReceivableId: row.id };
  } catch (error) {
    if (error instanceof Error && error.message === "client-not-found") {
      return { errors: { clientId: ["Cliente não encontrado"] } };
    }

    if (error instanceof Error && error.message === "contract-not-found") {
      return { errors: { contractId: ["Contrato não encontrado"] } };
    }

    throw error;
  }
}

export async function updateAccountReceivableAction(
  accountReceivableId: string,
  input: unknown,
): Promise<AccountReceivableFormState> {
  const parsed = accountReceivableUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const row = await updateAccountReceivable(accountReceivableId, parsed.data);

  if (!row) {
    return {
      errors: { form: ["Título não encontrado ou não pode ser editado"] },
    };
  }

  revalidatePath("/accounts-receivable");
  revalidatePath(`/accounts-receivable/${accountReceivableId}`);
  revalidatePath("/clients");
  revalidatePath(`/clients/${row.clientId}`);

  return { success: true, accountReceivableId: row.id };
}

export async function markAccountReceivableAsPaidAction(
  accountReceivableId: string,
  input: unknown,
): Promise<AccountReceivableFormState> {
  const parsed = markAccountReceivablePaidSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const row = await markAccountReceivableAsPaid(accountReceivableId, parsed.data);

  if (!row) {
    return {
      errors: { form: ["Título não encontrado ou já baixado"] },
    };
  }

  revalidatePath("/accounts-receivable");
  revalidatePath(`/accounts-receivable/${accountReceivableId}`);
  revalidatePath("/clients");
  revalidatePath(`/clients/${row.clientId}`);

  return { success: true, accountReceivableId: row.id };
}

export async function cancelAccountReceivableAction(
  accountReceivableId: string,
): Promise<AccountReceivableFormState> {
  const existing = await getAccountReceivableById(accountReceivableId);

  if (!existing) {
    return {
      errors: { form: ["Título não encontrado"] },
    };
  }

  const row = await cancelAccountReceivable(accountReceivableId);

  if (!row) {
    return {
      errors: { form: ["Título não pode ser cancelado"] },
    };
  }

  revalidatePath("/accounts-receivable");
  revalidatePath(`/accounts-receivable/${accountReceivableId}`);
  revalidatePath("/clients");
  revalidatePath(`/clients/${row.clientId}`);

  return { success: true, accountReceivableId: row.id };
}
