"use server";

import { revalidatePath } from "next/cache";
import { ReceitaRejectionError } from "open-nfse";

import {
  cancelServiceInvoiceSchema,
  emitServiceInvoiceSchema,
  type EmitServiceInvoiceFormState,
} from "@/schemas/service-invoices";
import { formatReceitaRejectionError } from "@/lib/format-receita-rejection";
import {
  cancelServiceInvoice,
  emitServiceInvoiceForAccountReceivable,
  recoverPersistFailedEmission,
} from "@/server/nfse/emit-service-invoice";
import { markCuiabaLive } from "@/server/dal/municipalities";

export async function emitServiceInvoiceAction(
  input: unknown,
): Promise<EmitServiceInvoiceFormState> {
  const parsed = emitServiceInvoiceSchema.safeParse(input);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await emitServiceInvoiceForAccountReceivable(parsed.data);

    revalidatePath("/accounts-receivable");
    revalidatePath(`/accounts-receivable/${parsed.data.accountReceivableId}`);
    revalidatePath("/service-invoices");
    if (result.serviceInvoiceId) {
      revalidatePath(`/service-invoices/${result.serviceInvoiceId}`);
    }

    return {
      success: true,
      serviceInvoiceId: result.serviceInvoiceId,
      retryPending: "retryPending" in result && result.retryPending === true,
      dpsNumber: "dpsNumber" in result ? result.dpsNumber : undefined,
      accessKey: "accessKey" in result ? result.accessKey : undefined,
    };
  } catch (error) {
    if (error instanceof ReceitaRejectionError) {
      return { message: formatReceitaRejectionError(error) };
    }

    if (error instanceof Error) {
      if (error.message === "persist-failed") {
        return {
          message:
            "A NFS-e foi autorizada, mas houve falha ao salvar localmente. Use recuperar emissão.",
        };
      }

      if (error.message === "nfse-already-issued") {
        return { message: "Esta conta já possui NFS-e ativa." };
      }

      if (error.message === "nfse-emission-in-progress") {
        return { message: "Já existe uma emissão em andamento para esta conta." };
      }

      if (error.message === "certificate-not-configured") {
        return { message: "Configure o certificado digital do emissor antes de emitir." };
      }

      return { message: error.message };
    }

    throw error;
  }
}

export async function recoverServiceInvoiceAction(
  accountReceivableId: string,
): Promise<EmitServiceInvoiceFormState> {
  try {
    const serviceInvoiceId = await recoverPersistFailedEmission(accountReceivableId);

    if (!serviceInvoiceId) {
      return { message: "Nenhuma emissão pendente de recuperação encontrada." };
    }

    revalidatePath("/accounts-receivable");
    revalidatePath(`/accounts-receivable/${accountReceivableId}`);
    revalidatePath("/service-invoices");
    revalidatePath(`/service-invoices/${serviceInvoiceId}`);

    return { success: true, serviceInvoiceId };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Erro ao recuperar emissão",
    };
  }
}

export async function cancelServiceInvoiceAction(input: unknown) {
  const parsed = cancelServiceInvoiceSchema.safeParse(input);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await cancelServiceInvoice(parsed.data);
  revalidatePath("/accounts-receivable");
  revalidatePath("/service-invoices");
  revalidatePath(`/service-invoices/${parsed.data.serviceInvoiceId}`);
  return { success: true as const };
}

export async function markCuiabaLiveAction() {
  await markCuiabaLive();
}
