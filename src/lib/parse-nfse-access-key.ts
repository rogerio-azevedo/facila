/** Extrai o nNFSe (13 dígitos) da chave de acesso nacional de 50 dígitos. */
export function parseNfseNumberFromAccessKey(
  accessKey: string | null | undefined,
): number | null {
  const digits = accessKey?.replace(/\D/g, "");
  if (!digits || digits.length !== 50) {
    return null;
  }

  const nfseNumber = Number(digits.slice(23, 36));
  return Number.isFinite(nfseNumber) && nfseNumber > 0 ? nfseNumber : null;
}

export function formatServiceInvoiceNumber(params: {
  dpsSeries: string;
  dpsNumber: number;
  accessKey?: string | null;
}): string {
  const nfseNumber = parseNfseNumberFromAccessKey(params.accessKey);
  return `${params.dpsSeries}/${nfseNumber ?? params.dpsNumber}`;
}
