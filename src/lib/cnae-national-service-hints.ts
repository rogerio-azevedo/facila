import hints from "@/data/cnae-national-service-hints.json";

export type CnaeNationalServiceHint = {
  cnaePrefix: string;
  nationalServiceCode: string;
  label: string;
};

const hintList = hints as CnaeNationalServiceHint[];

export function suggestNationalServiceCodeForCnae(cnaeCode: string) {
  const digits = cnaeCode.replace(/\D/g, "");
  if (digits.length !== 7) {
    return null;
  }

  const matches = hintList
    .filter((hint) => digits.startsWith(hint.cnaePrefix))
    .toSorted((a, b) => b.cnaePrefix.length - a.cnaePrefix.length);

  return matches[0] ?? null;
}
