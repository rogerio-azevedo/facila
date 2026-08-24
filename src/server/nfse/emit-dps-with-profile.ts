import "server-only";

import type { BuildDpsParams, NfseClient, NfseEmitResult } from "open-nfse";

import { usesIssnetEmitter } from "@/lib/nfse-issnet";
import { buildIbsCbsFromProfile } from "@/server/nfse/build-ibs-cbs";
import { emitDpsViaIssnet } from "@/server/nfse/issnet-nfse";
import type { IssuerServiceProfileRecord } from "@/server/dal/issuer-service-profiles";

function attachIbsCbsIfRequired(
  dps: ReturnType<typeof import("open-nfse").buildDps>,
  buildParams: BuildDpsParams,
  profile: IssuerServiceProfileRecord,
) {
  if (!buildParams.servico.cNBS) {
    return dps;
  }

  return {
    ...dps,
    infDPS: {
      ...dps.infDPS,
      IBSCBS: buildIbsCbsFromProfile(profile),
    },
  };
}

export async function emitDpsWithProfile(
  nfseClient: NfseClient,
  buildParams: BuildDpsParams,
  profile: IssuerServiceProfileRecord,
  options: {
    issuerId: string;
    environment: "homologacao" | "producao";
  },
): Promise<NfseEmitResult> {
  if (usesIssnetEmitter(buildParams.emitente.codMunicipio)) {
    return emitDpsViaIssnet({
      issuerId: options.issuerId,
      environment: options.environment,
      buildParams,
      profile,
    });
  }

  const { buildDps } = await import("open-nfse");

  const dps = buildDps(buildParams);
  const dpsWithIbsCbs = attachIbsCbsIfRequired(dps, buildParams, profile);

  return nfseClient.emitirDpsPronta(dpsWithIbsCbs, {
    skipCepValidation: true,
  });
}
