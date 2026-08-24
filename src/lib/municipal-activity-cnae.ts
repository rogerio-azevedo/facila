export function isMunicipalActivityCnaeCode(cTribMun: string): boolean {
  return cTribMun.replace(/\D/g, "").length === 7;
}

export function municipalActivityLabel(cTribMun: string): string {
  return isMunicipalActivityCnaeCode(cTribMun) ? "CNAE" : "cTribMun";
}

function digitsOnly(value: string | null | undefined): string {
  return value?.replace(/\D/g, "") ?? "";
}

type ProfileForActivityMatch = {
  cnaeCode: string;
  municipalTaxCode: string | null;
  nationalServiceCode: string;
};

export function findProfilesMatchingMunicipalActivity<
  T extends ProfileForActivityMatch,
>(activity: { cTribMun: string }, rowCnaeCode: string, profiles: T[]): T[] {
  const activityCode = digitsOnly(activity.cTribMun);
  const rowCnae = digitsOnly(rowCnaeCode);

  return profiles.filter((profile) => {
    const profileMunicipal = digitsOnly(profile.municipalTaxCode);
    const profileCnae = digitsOnly(profile.cnaeCode);

    if (activityCode && profileMunicipal && profileMunicipal === activityCode) {
      return true;
    }

    if (rowCnae && profileCnae && profileCnae === rowCnae) {
      return true;
    }

    return false;
  });
}
