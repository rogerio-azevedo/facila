export const CUIABA_IBGE = "5103403";

/** Sandbox ISSNet nacional exige Campo Grande/MS em homologação. */
export const ISSNET_HOMOLOG_IBGE = "5002704";

export function usesIssnetEmitter(ibgeCode: string): boolean {
  return ibgeCode === CUIABA_IBGE;
}

export function resolveIssnetCodMunicipioEmissao(
  ibgeCode: string,
  environment: "homologacao" | "producao",
): string {
  if (usesIssnetEmitter(ibgeCode) && environment !== "producao") {
    return ISSNET_HOMOLOG_IBGE;
  }

  return ibgeCode;
}
