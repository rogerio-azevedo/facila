export const MAX_CONTRACT_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export function validateContractPdf(file: File): string | null {
  if (file.size > MAX_CONTRACT_FILE_SIZE_BYTES) {
    return "O arquivo deve ter no máximo 20 MB.";
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "Apenas arquivos PDF são permitidos.";
  }

  return null;
}

export async function uploadContractPdf(contractId: string, file: File): Promise<void> {
  const validationError = validateContractPdf(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/contracts/${contractId}/file`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Falha no upload");
  }
}

export async function removeContractPdf(contractId: string): Promise<void> {
  const response = await fetch(`/api/contracts/${contractId}/file`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Falha ao remover");
  }
}
