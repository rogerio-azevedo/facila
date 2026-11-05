import "server-only";

import type { BuildDpsParams, NfseClient, NfseEmitResult } from "open-nfse";
import type { IssuerServiceProfileRecord } from "@/server/dal/issuer-service-profiles";

export async function emitDpsWithProfile(
  nfseClient: NfseClient,
  buildParams: BuildDpsParams,
  _profile: IssuerServiceProfileRecord,
  _options: {
    issuerId: string;
    environment: "homologacao" | "producao";
  },
): Promise<NfseEmitResult> {
  const { buildDps } = await import("open-nfse");

  const dps = buildDps(buildParams);

  return nfseClient.emitirDpsPronta(
    dps as unknown as Parameters<typeof nfseClient.emitirDpsPronta>[0],
    {
      skipCepValidation: true,
    },
  );
}
