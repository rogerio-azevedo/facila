import hints from "@/data/cnae-nbs-hints.json";
import { isDerivedNbsCode, normalizeNbsCode } from "@/lib/format-nbs";

export type CnaeNbsHint = {
  cnaePrefix: string;
  nbsCode: string;
  label: string;
};

const hintList = hints as CnaeNbsHint[];

export function suggestNbsCodeForCnae(cnaeCode: string) {
  const digits = cnaeCode.replace(/\D/g, "");
  if (digits.length !== 7) {
    return null;
  }

  const matches = hintList
    .filter((hint) => digits.startsWith(hint.cnaePrefix))
    .toSorted((a, b) => b.cnaePrefix.length - a.cnaePrefix.length);

  return matches[0] ?? null;
}

/** NBS editável no formulário: descarta derivado falso e sugere por CNAE se vazio. */
export function resolveProfileFormNbsCode(
  profileNbsCode: string | null | undefined,
  nationalServiceCode: string,
  cnaeCode?: string,
): string {
  const normalized = normalizeNbsCode(profileNbsCode);
  if (normalized && !isDerivedNbsCode(normalized, nationalServiceCode)) {
    return normalized;
  }

  if (cnaeCode) {
    return suggestNbsCodeForCnae(cnaeCode)?.nbsCode ?? "";
  }

  return "";
}
