export function normalizeMunicipalTaxCode(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : undefined;
}

/** Valor aceito pelo XSD nacional da NFS-e (exatamente 3 dígitos). */
export function toXsdMunicipalTaxCode(value: string | null | undefined): string | undefined {
  const digits = normalizeMunicipalTaxCode(value);
  if (!digits) {
    return undefined;
  }

  if (digits.length > 3) {
    return undefined;
  }

  return digits.padStart(3, "0");
}
