"use server";

import { ensureCnaeCodeSchema } from "@/schemas/cnae-codes";
import { municipalitySearchSchema, referenceCodeSearchSchema } from "@/schemas/municipalities";
import { formatCnaeLine } from "@/lib/format-cnae";
import { suggestNationalServiceCodeForCnae } from "@/lib/cnae-national-service-hints";
import { suggestNbsCodeForCnae } from "@/lib/cnae-nbs-hints";
import { ensureCnaeCode, getCnaeCodeByCode, searchCnaeCodes } from "@/server/dal/cnae-codes";
import { searchMunicipalities } from "@/server/dal/municipalities";
import {
  getNationalServiceCodeByCode,
  searchNationalServiceCodes,
} from "@/server/dal/national-service-codes";

export async function searchMunicipalitiesAction(input: unknown) {
  const parsed = municipalitySearchSchema.safeParse(input);
  if (!parsed.success) {
    return [];
  }

  return searchMunicipalities(parsed.data);
}

export async function searchCnaeCodesAction(input: unknown) {
  const parsed = referenceCodeSearchSchema.safeParse(input);
  if (!parsed.success) {
    return [];
  }

  return searchCnaeCodes(parsed.data);
}

export async function ensureCnaeCodeAction(input: unknown) {
  const parsed = ensureCnaeCodeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const row = await ensureCnaeCode(parsed.data);
  return {
    success: true as const,
    code: row.code,
    description: row.description,
  };
}

export async function searchNationalServiceCodesAction(input: unknown) {
  const parsed = referenceCodeSearchSchema.safeParse(input);
  if (!parsed.success) {
    return [];
  }

  return searchNationalServiceCodes(parsed.data);
}

export async function suggestNbsCodeForCnaeAction(cnaeCode: string) {
  return suggestNbsCodeForCnae(cnaeCode);
}

export async function suggestNationalServiceCodeForCnaeAction(cnaeCode: string) {
  const hint = suggestNationalServiceCodeForCnae(cnaeCode);
  if (!hint) {
    return null;
  }

  const row = await getNationalServiceCodeByCode(hint.nationalServiceCode);
  if (!row) {
    return hint;
  }

  return {
    ...hint,
    description: row.description,
  };
}

function parseMunicipalActivityDescription(cTribMun: string, xTribMun?: string): string {
  if (!xTribMun?.trim()) {
    return `Atividade ${cTribMun}`;
  }

  const bracketMatch = /^\[[\d./-]+\]\s*(.+)$/i.exec(xTribMun.trim());
  if (bracketMatch?.[1]) {
    return bracketMatch[1].trim();
  }

  return xTribMun.trim();
}

/** Em Cuiabá, cTribMun com 7 dígitos costuma ser o próprio CNAE. */
export async function resolveCnaeFromMunicipalActivityAction(activity: {
  cTribMun: string;
  xTribMun?: string;
}) {
  const digits = activity.cTribMun.replace(/\D/g, "");
  if (digits.length !== 7) {
    return null;
  }

  let cnae = await getCnaeCodeByCode(digits);
  if (!cnae) {
    cnae = await ensureCnaeCode({
      code: digits,
      description: parseMunicipalActivityDescription(activity.cTribMun, activity.xTribMun),
    });
  }

  const suggestion = await suggestNationalServiceCodeForCnaeAction(digits);
  const nbsHint = suggestNbsCodeForCnae(digits);

  return {
    cnaeCode: cnae.code,
    cnaeLabel: formatCnaeLine(cnae.code, cnae.description),
    nationalServiceCode: suggestion?.nationalServiceCode ?? "",
    nationalServiceLabel:
      suggestion && "description" in suggestion && suggestion.description
        ? `${suggestion.nationalServiceCode} — ${suggestion.description}`
        : (suggestion?.nationalServiceCode ?? ""),
    nbsCode: nbsHint?.nbsCode ?? "",
  };
}
