"use server";

import { revalidatePath } from "next/cache";

import { markCuiabaLive } from "@/server/dal/municipalities";
import { getIssuerById, updateIssuerEnvironment } from "@/server/dal/issuers";
import { CUIABA_IBGE } from "@/lib/nfse-issnet";

export async function toggleIssuerEnvironmentAction(issuerId: string) {
  const issuer = await getIssuerById(issuerId);

  if (!issuer) {
    return;
  }

  const nextEnvironment = issuer.environment === "homologacao" ? "producao" : "homologacao";
  await updateIssuerEnvironment(issuerId, nextEnvironment);

  if (nextEnvironment === "producao" && issuer.codMunicipioIbge === CUIABA_IBGE) {
    await markCuiabaLive();
  }

  revalidatePath(`/issuers/${issuerId}`);
  revalidatePath("/issuers");
}
