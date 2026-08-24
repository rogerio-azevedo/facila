export function formatNbsCode(code: string): string {
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 9) {
    return code;
  }

  return `${digits[0]}.${digits.slice(1, 5)}.${digits.slice(5, 7)}.${digits.slice(7, 9)}`;
}

export function normalizeNbsCode(code: string | null | undefined): string | undefined {
  if (!code) {
    return undefined;
  }

  const digits = code.replace(/\D/g, "");
  if (digits.length === 0) {
    return undefined;
  }

  return digits.padStart(9, "0").slice(-9);
}

/** Mesma heurística de scripts/fetch-national-service-codes.mjs — não é tabela oficial NBS. */
export function deriveNbsCodeFromNationalService(
  nationalServiceCode: string,
): string | undefined {
  const code = nationalServiceCode.replace(/\D/g, "");
  if (code.length !== 6) {
    return undefined;
  }

  const item = code.slice(0, 2);
  const subitem = code.slice(2, 4);

  if (item === "01") {
    return normalizeNbsCode(`1.15${subitem}.00.00`);
  }

  return normalizeNbsCode(`${parseInt(item, 10)}.${subitem}.00.00`);
}

export function isDerivedNbsCode(
  nbsCode: string | null | undefined,
  nationalServiceCode: string,
): boolean {
  const normalized = normalizeNbsCode(nbsCode);
  const derived = deriveNbsCodeFromNationalService(nationalServiceCode);

  return Boolean(normalized && derived && normalized === derived);
}

/** cNBS só entra na DPS se for NBS real (9 dígitos) e não derivado do item LC 116. */
export function resolveEmissionNbsCode(
  profileNbsCode: string | null | undefined,
  nationalServiceCode: string,
): string | undefined {
  const normalized = normalizeNbsCode(profileNbsCode);
  if (!normalized || normalized.length !== 9) {
    return undefined;
  }

  if (isDerivedNbsCode(normalized, nationalServiceCode)) {
    return undefined;
  }

  return normalized;
}
