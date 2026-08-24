import "server-only";

import { Ambiente, NfseClient } from "open-nfse";

import type { IssuerDetail } from "@/server/dal/issuers";
import { IssuerCertificateProvider } from "@/server/nfse/certificate-provider";
import { PostgresDpsCounter } from "@/server/nfse/dps-counter";
import { postgresRetryStore } from "@/server/nfse/retry-store";

export function buildNfseClient(issuer: IssuerDetail): NfseClient {
  const ambiente =
    issuer.environment === "producao" ? Ambiente.Producao : Ambiente.ProducaoRestrita;

  return new NfseClient({
    ambiente,
    certificado: new IssuerCertificateProvider(issuer.id),
    emitente: {
      cnpj: issuer.cnpj,
      inscricaoMunicipal: issuer.municipalRegistration ?? "",
      codigoMunicipio: issuer.codMunicipioIbge,
    },
    dpsCounter: new PostgresDpsCounter(issuer.id),
    retryStore: postgresRetryStore,
    timeoutMs: 60_000,
  });
}
