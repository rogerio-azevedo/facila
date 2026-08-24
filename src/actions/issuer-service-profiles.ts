"use server";

import { revalidatePath } from "next/cache";

import {
  issuerServiceProfileSchema,
  type IssuerServiceProfileFormState,
} from "@/schemas/issuer-service-profiles";
import {
  createIssuerServiceProfile,
  deleteIssuerServiceProfile,
  getIssuerServiceProfileById,
  setDefaultIssuerServiceProfile,
  updateIssuerServiceProfile,
} from "@/server/dal/issuer-service-profiles";
import { ensureIssuerCnae, getIssuerById } from "@/server/dal/issuers";
import {
  consultarCadastroMunicipalIssuer,
} from "@/server/nfse/consultar-cadastro-municipal";
import type { ConsultarCadastroMunicipalResult } from "@/schemas/municipal-cadastro";

export type { ConsultarCadastroMunicipalResult, MunicipalCadastroActivity } from "@/schemas/municipal-cadastro";

export async function consultarCadastroMunicipalAction(
  issuerId: string,
): Promise<ConsultarCadastroMunicipalResult> {
  return consultarCadastroMunicipalIssuer(issuerId);
}

export async function saveIssuerServiceProfileAction(
  issuerId: string,
  profileId: string | null,
  input: unknown,
): Promise<IssuerServiceProfileFormState> {
  const parsed = issuerServiceProfileSchema.safeParse(input);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const issuer = await getIssuerById(issuerId);
  if (!issuer) {
    return { message: "Emissor não encontrado" };
  }

  if (issuer.opSimpNac === "3" && parsed.data.pTotTribSn === undefined) {
    return {
      errors: {
        pTotTribSn: ["Obrigatório para emissores ME/EPP (pTotTribSN — erro E0712)"],
      },
    };
  }

  if (profileId) {
    const updated = await updateIssuerServiceProfile(profileId, parsed.data);
    if (!updated) {
      return { message: "Perfil fiscal não encontrado" };
    }

    await ensureIssuerCnae(updated.issuerId, updated.cnaeCode, {
      isPrimary: updated.isDefault,
    });
  } else {
    const created = await createIssuerServiceProfile(issuerId, parsed.data);
    await ensureIssuerCnae(created.issuerId, created.cnaeCode, {
      isPrimary: created.isDefault,
    });
  }

  revalidatePath(`/issuers/${issuerId}`);
  return { success: true };
}

export async function deleteIssuerServiceProfileAction(issuerId: string, profileId: string) {
  await deleteIssuerServiceProfile(profileId);
  revalidatePath(`/issuers/${issuerId}`);
}

export async function setDefaultIssuerServiceProfileAction(issuerId: string, profileId: string) {
  const updated = await setDefaultIssuerServiceProfile(issuerId, profileId);
  if (updated) {
    const profile = await getIssuerServiceProfileById(profileId);
    if (profile) {
      await ensureIssuerCnae(profile.issuerId, profile.cnaeCode, { isPrimary: true });
    }
  }
  revalidatePath(`/issuers/${issuerId}`);
}
