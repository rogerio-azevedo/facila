const MAX_CERTIFICATE_SIZE_BYTES = 5 * 1024 * 1024;

export function validateIssuerCertificate(file: File) {
  if (!file || file.size === 0) {
    return "Selecione um arquivo de certificado";
  }

  if (file.size > MAX_CERTIFICATE_SIZE_BYTES) {
    return "O arquivo deve ter no máximo 5 MB";
  }

  const lowerName = file.name.toLowerCase();
  const isPfx = lowerName.endsWith(".pfx") || lowerName.endsWith(".p12");

  if (!isPfx) {
    return "Apenas arquivos .pfx ou .p12 são permitidos";
  }

  return null;
}

export async function uploadIssuerCertificate(
  issuerId: string,
  file: File,
  password: string,
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("password", password);

  const response = await fetch(`/api/issuers/${issuerId}/certificate`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Não foi possível enviar o certificado");
  }
}

export async function removeIssuerCertificate(issuerId: string): Promise<void> {
  const response = await fetch(`/api/issuers/${issuerId}/certificate`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Não foi possível remover o certificado");
  }
}

export async function fetchIssuerCertificatePassword(issuerId: string): Promise<string> {
  const response = await fetch(`/api/issuers/${issuerId}/certificate?part=password`);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Não foi possível obter a senha do certificado");
  }

  const payload = (await response.json()) as { password?: string };

  if (!payload.password) {
    throw new Error("Senha do certificado indisponível");
  }

  return payload.password;
}

export async function downloadIssuerCertificate(
  issuerId: string,
  fileName: string,
): Promise<void> {
  const response = await fetch(`/api/issuers/${issuerId}/certificate`);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Não foi possível baixar o certificado");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
