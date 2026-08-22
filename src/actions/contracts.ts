"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { contractSchema, type ContractFormState } from "@/schemas/contracts";
import {
  deleteContract,
  getContractById,
  updateContract,
  createContract,
} from "@/server/dal/contracts";
import { deleteContractFile } from "@/server/storage/r2";

export async function createContractAction(input: unknown): Promise<ContractFormState> {
  const parsed = contractSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const contract = await createContract(parsed.data);
    revalidatePath("/contracts");
    revalidatePath("/clients");
    return { success: true, contractId: contract.id };
  } catch (error) {
    if (error instanceof Error && error.message === "client-not-found") {
      return {
        errors: { clientId: ["Cliente não encontrado"] },
      };
    }

    throw error;
  }
}

export async function updateContractAction(
  contractId: string,
  input: unknown,
): Promise<ContractFormState> {
  const parsed = contractSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const contract = await updateContract(contractId, parsed.data);

    if (!contract) {
      return {
        errors: { form: ["Contrato não encontrado"] },
      };
    }

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);
    revalidatePath("/clients");
    revalidatePath(`/clients/${contract.clientId}`);

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "client-not-found") {
      return {
        errors: { clientId: ["Cliente não encontrado"] },
      };
    }

    throw error;
  }
}

export async function deleteContractAction(contractId: string): Promise<ContractFormState> {
  const existing = await getContractById(contractId);

  if (!existing) {
    return {
      errors: { form: ["Contrato não encontrado"] },
    };
  }

  if (existing.fileKey) {
    try {
      await deleteContractFile(existing.fileKey);
    } catch {
      // Ignora falha ao remover do R2 — contrato será excluído mesmo assim
    }
  }

  const deleted = await deleteContract(contractId);

  if (!deleted) {
    return {
      errors: { form: ["Contrato não encontrado"] },
    };
  }

  revalidatePath("/contracts");
  revalidatePath("/clients");
  revalidatePath(`/clients/${existing.clientId}`);
  redirect("/contracts");
}
