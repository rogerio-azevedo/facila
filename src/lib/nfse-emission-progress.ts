import type { EmitServiceInvoiceFormState } from "@/schemas/service-invoices";

export type NfseEmissionProgressState =
  | "pending"
  | "processing"
  | "success"
  | "retry"
  | "error";

export type NfseEmissionProgressItem = {
  id: string;
  label: string;
  amount?: string;
  state: NfseEmissionProgressState;
  message?: string;
  dpsNumber?: number;
  serviceInvoiceId?: string;
};

export type NfseEmissionTarget = {
  id: string;
  label: string;
  amount?: string;
};

export function createPendingEmissionItems(
  targets: NfseEmissionTarget[],
): NfseEmissionProgressItem[] {
  return targets.map((target) => ({
    id: target.id,
    label: target.label,
    amount: target.amount,
    state: "pending",
  }));
}

export function mapEmitResultToProgressUpdate(result: EmitServiceInvoiceFormState): Pick<
  NfseEmissionProgressItem,
  "state" | "message" | "dpsNumber" | "serviceInvoiceId"
> {
  if (result.errors) {
    return {
      state: "error",
      message: Object.values(result.errors).flat().join(", "),
    };
  }

  if (result.success && result.retryPending) {
    return {
      state: "retry",
      message: "Emissão pendente de nova tentativa na Receita Federal",
      dpsNumber: result.dpsNumber,
      serviceInvoiceId: result.serviceInvoiceId,
    };
  }

  if (result.success) {
    return {
      state: "success",
      dpsNumber: result.dpsNumber,
      serviceInvoiceId: result.serviceInvoiceId,
    };
  }

  return {
    state: "error",
    message: result.message ?? "Falha na emissão",
  };
}

export function countEmissionProgress(items: NfseEmissionProgressItem[]) {
  const total = items.length;
  const success = items.filter((item) => item.state === "success").length;
  const failed = items.filter((item) => item.state === "error").length;
  const retry = items.filter((item) => item.state === "retry").length;
  const processing = items.filter((item) => item.state === "processing").length;
  const pending = items.filter((item) => item.state === "pending").length;
  const finished = success + failed + retry;
  const progressPercent = total > 0 ? Math.round((finished / total) * 100) : 0;

  return {
    total,
    success,
    failed,
    retry,
    processing,
    pending,
    finished,
    progressPercent,
  };
}

export function getEmissionDialogTitle(
  running: boolean,
  counts: ReturnType<typeof countEmissionProgress>,
) {
  if (running) {
    return "Emitindo NFS-e";
  }

  if (counts.failed > 0) {
    return "Emissão concluída com falhas";
  }

  return "Emissão concluída";
}

export function getEmissionDialogDescription(
  running: boolean,
  counts: ReturnType<typeof countEmissionProgress>,
) {
  if (running) {
    const current = counts.finished + (counts.processing > 0 ? 1 : 0);

    if (counts.processing > 0) {
      return `Enviando ${Math.min(current, counts.total)} de ${counts.total} para a Receita Federal`;
    }

    return `Preparando emissão (${counts.finished} de ${counts.total} concluídas)`;
  }

  return `${counts.total} nota(s) processada(s)`;
}
