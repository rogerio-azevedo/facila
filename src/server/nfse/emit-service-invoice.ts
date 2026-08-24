import "server-only";

import {
  JustificativaCancelamento,
  NetworkError,
  OpcaoSimplesNacional,
  ReceitaRejectionError,
  RegimeApuracaoSimplesNacional,
  RegimeEspecialTributacao,
  ServerError,
  TimeoutError,
  TipoAmbienteDps,
  TipoRetISSQN,
  TooManyRequestsError,
  gerarDanfse,
  parseNfseXml,
  type BuildDpsParams,
  type NFSe,
} from "open-nfse";

import {
  getPrimaryAddressForClient,
  getPrimaryAddressForIssuer,
} from "@/server/dal/addresses";
import { getAccountReceivableById } from "@/server/dal/accounts-receivable";
import { getClientById } from "@/server/dal/clients";
import {
  getDefaultIssuerServiceProfile,
  getIssuerServiceProfileById,
} from "@/server/dal/issuer-service-profiles";
import { getDefaultIssuer,
  getIssuerById,
  releaseReservedDpsNumber,
  reserveNextDpsNumber,
} from "@/server/dal/issuers";
import {
  buildPersistFailedReason,
  createServiceInvoice,
  getServiceInvoiceById,
  listServiceInvoicesByAccountReceivable,
  parsePersistFailedReason,
  updateServiceInvoice,
} from "@/server/dal/service-invoices";
import { db } from "@/server/db";
import { accountsReceivable } from "@/server/db/schema";
import { requireCompanyContext } from "@/server/dal/context";
import { buildNfseClient } from "@/server/nfse/client";
import { uploadNfseFile } from "@/server/storage/r2-certificates";
import { canEmitNfseByStatus } from "@/lib/account-receivable-nfse-eligibility";
import { formatReceitaRejectionError } from "@/lib/format-receita-rejection";
import { resolveEmissionNbsCode } from "@/lib/format-nbs";
import {
  normalizeNfseCep,
  normalizeNfseDocument,
  normalizeNfseFone,
  resolveEmissionCompetenceDate,
} from "@/lib/nfse-normalize";
import { parsePercent } from "@/lib/parse-percent";
import {
  normalizeMunicipalTaxCode,
  toXsdMunicipalTaxCode,
} from "@/lib/normalize-municipal-tax-code";
import { usesIssnetEmitter } from "@/lib/nfse-issnet";
import { eq } from "drizzle-orm";
import type { IssuerServiceProfileRecord } from "@/server/dal/issuer-service-profiles";
import { emitDpsWithProfile } from "@/server/nfse/emit-dps-with-profile";
import { cancelNfseViaIssnet } from "@/server/nfse/issnet-nfse";

function mapOpSimpNac(value: string): OpcaoSimplesNacional {
  switch (value) {
    case "2":
      return OpcaoSimplesNacional.Mei;
    case "3":
      return OpcaoSimplesNacional.MeEpp;
    default:
      return OpcaoSimplesNacional.NaoOptante;
  }
}

function mapRegApTribSn(value: string | null | undefined): RegimeApuracaoSimplesNacional | undefined {
  if (!value) return undefined;
  switch (value) {
    case "2":
      return RegimeApuracaoSimplesNacional.FederalPeloSNMunicipalFora;
    case "3":
      return RegimeApuracaoSimplesNacional.FederalEMunicipalFora;
    default:
      return RegimeApuracaoSimplesNacional.FederalEMunicipalPeloSN;
  }
}

function validateIssuerForEmission(issuer: {
  opSimpNac: string;
  regApTribSn: string | null;
  certificateFileKey: string | null;
  certificatePasswordCiphertext: string | null;
}) {
  if (!issuer.certificateFileKey || !issuer.certificatePasswordCiphertext) {
    throw new Error("certificate-not-configured");
  }

  if (issuer.opSimpNac === "3" && !issuer.regApTribSn) {
    throw new Error(
      "Configure o regime de apuração do Simples Nacional (regApTribSN) no emissor antes de emitir.",
    );
  }
}

function validateServiceProfileForEmission(
  issuer: { opSimpNac: string },
  profile: { name: string; pTotTribSn: string | null },
) {
  if (issuer.opSimpNac !== "3") {
    return;
  }

  if (parsePercent(profile.pTotTribSn) === undefined) {
    throw new Error(
      `Configure o % total de tributos SN (pTotTribSN) na tributação "${profile.name}" antes de emitir.`,
    );
  }
}

async function resolveServiceProfileForEmission(
  issuerId: string,
  input: { issuerServiceProfileId?: string },
  account: { issuerServiceProfileId: string | null },
): Promise<IssuerServiceProfileRecord | null> {
  if (input.issuerServiceProfileId) {
    const profile = await getIssuerServiceProfileById(input.issuerServiceProfileId);
    if (profile?.issuerId === issuerId) {
      return profile;
    }
  }

  if (account.issuerServiceProfileId) {
    const profile = await getIssuerServiceProfileById(account.issuerServiceProfileId);
    if (profile?.issuerId === issuerId) {
      return profile;
    }
  }

  return getDefaultIssuerServiceProfile(issuerId);
}

const ISSNET_DPS_CONSUMED_REJECTION_CODES = new Set(["E0014"]);

function isIssnetDpsNumberConsumed(error: ReceitaRejectionError): boolean {
  return error.mensagens.some((mensagem) =>
    ISSNET_DPS_CONSUMED_REJECTION_CODES.has(mensagem.codigo),
  );
}

function shouldReleaseReservedDps(
  error: unknown,
  hasAuthorizedPayload: boolean,
  usesIssnet: boolean,
) {
  if (hasAuthorizedPayload) {
    return false;
  }

  if (error instanceof ReceitaRejectionError) {
    // ISSNet: rejeição sem NFS-e gerada não avança o sequencial municipal —
    // liberar o nDPS reservado (mesmo comportamento do MeuIOT), salvo E0014.
    if (usesIssnet && !isIssnetDpsNumberConsumed(error)) {
      return true;
    }

    // SEFIN nacional: rejeição consome o nDPS.
    return false;
  }

  // Falha após envio ou ambígua — não recicla o sequencial (pode ter sido autorizada).
  if (
    error instanceof NetworkError ||
    error instanceof TimeoutError ||
    error instanceof TooManyRequestsError ||
    error instanceof ServerError
  ) {
    return false;
  }

  // Erros locais (validação, bundling, certificado, etc.) — devolve o número reservado.
  return true;
}

function firstNonEmptyText(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return undefined;
}

function mapRegEspTrib(value: string): RegimeEspecialTributacao {
  const map: Record<string, RegimeEspecialTributacao> = {
    "0": RegimeEspecialTributacao.Nenhum,
    "1": RegimeEspecialTributacao.AtoCooperado,
    "2": RegimeEspecialTributacao.Estimativa,
    "3": RegimeEspecialTributacao.MicroempresaMunicipal,
    "4": RegimeEspecialTributacao.NotarioRegistrador,
    "5": RegimeEspecialTributacao.ProfissionalAutonomo,
    "6": RegimeEspecialTributacao.SociedadeProfissionais,
    "9": RegimeEspecialTributacao.Outros,
  };

  return map[value] ?? RegimeEspecialTributacao.Nenhum;
}

async function linkAccountReceivableToInvoice(params: {
  accountReceivableId: string;
  issuerId: string;
  issuerServiceProfileId: string;
  serviceInvoiceId: string;
  nfseStatus: "pending" | "authorized" | "rejected" | "error" | "canceled";
}) {
  await db
    .update(accountsReceivable)
    .set({
      issuerId: params.issuerId,
      issuerServiceProfileId: params.issuerServiceProfileId,
      activeServiceInvoiceId: params.serviceInvoiceId,
      nfseStatus: params.nfseStatus,
      updatedAt: new Date(),
    })
    .where(eq(accountsReceivable.id, params.accountReceivableId));
}

async function persistAuthorizedInvoice(params: {
  companyId: string;
  serviceInvoiceId: string;
  accountReceivableId: string;
  issuerId: string;
  issuerServiceProfileId: string;
  accessKey: string;
  dpsXml?: string;
  nfseXml: string;
  nfse: NFSe;
}) {
  const danfseBuffer = await gerarDanfse(params.nfse);

  const [dpsXmlKey, nfseXmlKey, danfseKey] = await Promise.all([
    params.dpsXml
      ? uploadNfseFile({
          companyId: params.companyId,
          serviceInvoiceId: params.serviceInvoiceId,
          kind: "dps",
          filename: "dps.xml",
          body: params.dpsXml,
          contentType: "application/xml",
        })
      : Promise.resolve(null),
    uploadNfseFile({
      companyId: params.companyId,
      serviceInvoiceId: params.serviceInvoiceId,
      kind: "nfse",
      filename: "nfse.xml",
      body: params.nfseXml,
      contentType: "application/xml",
    }),
    uploadNfseFile({
      companyId: params.companyId,
      serviceInvoiceId: params.serviceInvoiceId,
      kind: "danfse",
      filename: "danfse.pdf",
      body: danfseBuffer,
      contentType: "application/pdf",
    }),
  ]);

  await db.transaction(async (tx) => {
    await updateServiceInvoice(
      params.serviceInvoiceId,
      {
        status: "authorized",
        accessKey: params.accessKey,
        dpsXmlKey,
        nfseXmlKey,
        danfseKey,
        authorizedAt: new Date(),
        rejectionReason: null,
      },
      tx,
    );

    await tx
      .update(accountsReceivable)
      .set({
        issuerId: params.issuerId,
        issuerServiceProfileId: params.issuerServiceProfileId,
        activeServiceInvoiceId: params.serviceInvoiceId,
        nfseStatus: "authorized",
        updatedAt: new Date(),
      })
      .where(eq(accountsReceivable.id, params.accountReceivableId));
  });
}

export async function recoverPersistFailedEmission(accountReceivableId: string) {
  const account = await getAccountReceivableById(accountReceivableId);
  if (!account) {
    throw new Error("account-not-found");
  }

  const invoices = await listServiceInvoicesByAccountReceivable(accountReceivableId);
  const failedInvoice = invoices.find((invoice) =>
    parsePersistFailedReason(invoice.rejectionReason),
  );

  const persistData = parsePersistFailedReason(failedInvoice?.rejectionReason);
  if (!persistData) {
    return null;
  }

  const accessKey = String(persistData.chaveAcesso ?? "");
  const nfseXml = String(persistData.xmlNfse ?? "");
  const issuerId = String(persistData.issuerId ?? account.issuerId ?? "");
  const issuerServiceProfileId = String(
    persistData.issuerServiceProfileId ?? account.issuerServiceProfileId ?? "",
  );
  const dpsSeries = String(persistData.dpsSeries ?? "1");
  const dpsNumber = Number(persistData.nDPS ?? persistData.dpsNumber ?? 0);
  const environment =
    (persistData.environment as "homologacao" | "producao" | undefined) ?? "homologacao";

  if (!accessKey || !nfseXml || !issuerId || !issuerServiceProfileId || !dpsNumber) {
    throw new Error("persist-failed-incomplete");
  }

  const ctx = await requireCompanyContext();
  const invoice =
    failedInvoice ??
    (await createServiceInvoice({
      companyId: ctx.companyId,
      issuerId,
      accountReceivableId,
      issuerServiceProfileId,
      dpsSeries,
      dpsNumber,
      environment,
    }));

  const nfse = parseNfseXml(nfseXml);

  await persistAuthorizedInvoice({
    companyId: ctx.companyId,
    serviceInvoiceId: invoice.id,
    accountReceivableId,
    issuerId,
    issuerServiceProfileId,
    accessKey,
    nfseXml,
    nfse,
    dpsXml: String(persistData.dpsXml ?? ""),
  });

  return invoice.id;
}

export async function emitServiceInvoiceForAccountReceivable(input: {
  accountReceivableId: string;
  issuerId?: string;
  issuerServiceProfileId?: string;
}) {
  const ctx = await requireCompanyContext();
  const account = await getAccountReceivableById(input.accountReceivableId);

  if (!account) {
    throw new Error("account-not-found");
  }

  if (account.status !== "pending") {
    throw new Error("account-not-pending");
  }

  if (!canEmitNfseByStatus(account.status, account.nfseStatus)) {
    if (account.nfseStatus === "authorized") {
      throw new Error("nfse-already-issued");
    }

    if (account.nfseStatus === "pending") {
      throw new Error("nfse-emission-in-progress");
    }

    throw new Error("nfse-not-eligible");
  }

  const persistFailedInvoice = (
    await listServiceInvoicesByAccountReceivable(input.accountReceivableId)
  ).find((invoice) => parsePersistFailedReason(invoice.rejectionReason));

  if (persistFailedInvoice) {
    const recoveredId = await recoverPersistFailedEmission(input.accountReceivableId);
    if (recoveredId) {
      const recoveredInvoice = await getServiceInvoiceById(recoveredId);

      return {
        serviceInvoiceId: recoveredId,
        recovered: true as const,
        dpsNumber: recoveredInvoice?.dpsNumber,
        accessKey: recoveredInvoice?.accessKey ?? undefined,
      };
    }
  }

  const issuer =
    (input.issuerId ? await getIssuerById(input.issuerId) : null) ??
    (await getDefaultIssuer());

  if (!issuer) {
    throw new Error("issuer-not-found");
  }

  if (!issuer.certificateFileKey || !issuer.certificatePasswordCiphertext) {
    throw new Error("certificate-not-configured");
  }

  validateIssuerForEmission(issuer);

  const profile = await resolveServiceProfileForEmission(issuer.id, input, account);

  if (!profile) {
    throw new Error("service-profile-not-found");
  }

  validateServiceProfileForEmission(issuer, profile);

  const [clientRecord, clientAddress] = await Promise.all([
    getClientById(account.clientId),
    getPrimaryAddressForClient(account.clientId),
  ]);

  if (!clientRecord) {
    throw new Error("client-not-found");
  }

  const issuerAddress = await getPrimaryAddressForIssuer(issuer.id);

  if (!issuerAddress) {
    throw new Error("issuer-address-not-found");
  }

  const dpsNumber = await reserveNextDpsNumber(issuer.id);

  const invoice = await createServiceInvoice({
    companyId: ctx.companyId,
    issuerId: issuer.id,
    accountReceivableId: account.id,
    issuerServiceProfileId: profile.id,
    dpsSeries: issuer.dpsSeries,
    dpsNumber,
    environment: issuer.environment,
  });

  await linkAccountReceivableToInvoice({
    accountReceivableId: account.id,
    issuerId: issuer.id,
    issuerServiceProfileId: profile.id,
    serviceInvoiceId: invoice.id,
    nfseStatus: "pending",
  });

  const issuerDetail = await getIssuerById(issuer.id);
  if (!issuerDetail) {
    throw new Error("issuer-not-found");
  }

  const nfseClient = buildNfseClient(issuerDetail);
  const amount = Number(account.amount);
  const issRate = Number(profile.issRate);
  const municipalTaxCode = usesIssnetEmitter(issuer.codMunicipioIbge)
    ? normalizeMunicipalTaxCode(profile.municipalTaxCode)
    : toXsdMunicipalTaxCode(profile.municipalTaxCode);
  const nbsCode = resolveEmissionNbsCode(profile.nbsCode, profile.nationalServiceCode);
  const pTotTribSn =
    issuer.opSimpNac === "3" ? parsePercent(profile.pTotTribSn) : undefined;

  const tomadorDocument = normalizeNfseDocument(clientRecord.document);
  if (!tomadorDocument) {
    throw new Error("client-document-invalid");
  }

  const tomadorEndereco = clientAddress
    ? {
        codMunicipio:
          clientAddress.codMunicipioIbge ??
          normalizeNfseCep(clientAddress.postalCode)?.slice(0, 7) ??
          "",
        cep: normalizeNfseCep(clientAddress.postalCode) ?? clientAddress.postalCode,
        logradouro: clientAddress.street,
        numero: clientAddress.number,
        bairro: clientAddress.neighborhood,
        complemento: clientAddress.complement ?? undefined,
      }
    : undefined;

  const tomador =
    clientRecord.personType === "organization"
      ? {
          documento: { CNPJ: tomadorDocument },
          nome: clientRecord.legalName ?? clientRecord.name,
          email: clientRecord.email ?? undefined,
          fone: normalizeNfseFone(clientRecord.phone),
          endereco: tomadorEndereco,
        }
      : {
          documento: { CPF: tomadorDocument },
          nome: clientRecord.name,
          email: clientRecord.email ?? undefined,
          fone: normalizeNfseFone(clientRecord.phone),
          endereco: tomadorEndereco,
        };

  try {
    const buildParams: BuildDpsParams = {
      emitente: {
        cnpj: issuer.cnpj,
        codMunicipio: issuer.codMunicipioIbge,
        inscricaoMunicipal: issuer.municipalRegistration ?? undefined,
        email: issuer.email ?? undefined,
        fone: normalizeNfseFone(issuer.phone),
        regime: {
          opSimpNac: mapOpSimpNac(issuer.opSimpNac),
          regEspTrib: mapRegEspTrib(issuer.regEspTrib),
          regApTribSN: mapRegApTribSn(issuer.regApTribSn),
        },
      },
      serie: issuer.dpsSeries,
      nDPS: String(dpsNumber),
      tpAmb:
        issuer.environment === "producao"
          ? TipoAmbienteDps.Producao
          : TipoAmbienteDps.Homologacao,
      dCompet: resolveEmissionCompetenceDate(account.competenceDate),
      servico: {
        cTribNac: profile.nationalServiceCode,
        ...(nbsCode ? { cNBS: nbsCode } : {}),
        descricao:
          firstNonEmptyText(
            account.description,
            profile.description,
            profile.name,
          ) ?? "Serviço prestado",
        codMunicipioPrestacao: issuer.codMunicipioIbge,
        ...(municipalTaxCode ? { cTribMun: municipalTaxCode } : {}),
      },
      valores: {
        vServ: amount,
        aliqIss: issRate,
        tpRetISSQN: profile.issRetained
          ? TipoRetISSQN.RetidoPeloTomador
          : TipoRetISSQN.NaoRetido,
        ...(issuer.opSimpNac === "3" && pTotTribSn !== undefined
          ? { pTotTribSN: pTotTribSn }
          : {}),
      },
      tomador,
    };

    const nfseResult = await emitDpsWithProfile(nfseClient, buildParams, profile, {
      issuerId: issuer.id,
      environment: issuer.environment,
    });

    await persistAuthorizedInvoice({
      companyId: ctx.companyId,
      serviceInvoiceId: invoice.id,
      accountReceivableId: account.id,
      issuerId: issuer.id,
      issuerServiceProfileId: profile.id,
      accessKey: nfseResult.chaveAcesso,
      nfseXml: nfseResult.xmlNfse,
      nfse: nfseResult.nfse,
    });

    return {
      serviceInvoiceId: invoice.id,
      authorized: true as const,
      dpsNumber: invoice.dpsNumber,
      accessKey: nfseResult.chaveAcesso,
    };
  } catch (error) {
    const message =
      error instanceof ReceitaRejectionError
        ? formatReceitaRejectionError(error)
        : error instanceof Error
          ? error.message
          : "Erro desconhecido";

    const persistPayload = {
      chaveAcesso: (error as { chaveAcesso?: string }).chaveAcesso,
      xmlNfse: (error as { xmlNfse?: string }).xmlNfse,
      idDps: (error as { idDps?: string }).idDps,
      nDPS: dpsNumber,
      issuerId: issuer.id,
      issuerServiceProfileId: profile.id,
      dpsSeries: issuer.dpsSeries,
      environment: issuer.environment,
    };

    if (
      shouldReleaseReservedDps(
        error,
        Boolean(persistPayload.chaveAcesso && persistPayload.xmlNfse),
        usesIssnetEmitter(issuer.codMunicipioIbge),
      )
    ) {
      await releaseReservedDpsNumber(issuer.id, dpsNumber);
    }

    if (persistPayload.chaveAcesso && persistPayload.xmlNfse) {
      await db
        .update(accountsReceivable)
        .set({
          nfseStatus: "error",
          updatedAt: new Date(),
        })
        .where(eq(accountsReceivable.id, account.id));

      await updateServiceInvoice(invoice.id, {
        status: "error",
        rejectionReason: buildPersistFailedReason(persistPayload),
      });

      throw new Error("persist-failed");
    }

    await updateServiceInvoice(invoice.id, {
      status: "rejected",
      rejectionReason: message,
    });

    await db
      .update(accountsReceivable)
      .set({
        nfseStatus: "rejected",
        activeServiceInvoiceId: null,
        updatedAt: new Date(),
      })
      .where(eq(accountsReceivable.id, account.id));

    throw error;
  }
}

export async function cancelServiceInvoice(input: {
  serviceInvoiceId: string;
  reason: string;
}) {
  const invoice = await getServiceInvoiceById(input.serviceInvoiceId);

  if (!invoice) {
    throw new Error("service-invoice-not-found");
  }

  if (invoice.status !== "authorized" || !invoice.accessKey) {
    throw new Error("service-invoice-not-cancelable");
  }

  const issuer = await getIssuerById(invoice.issuerId);
  if (!issuer) {
    throw new Error("issuer-not-found");
  }

  if (usesIssnetEmitter(issuer.codMunicipioIbge)) {
    await cancelNfseViaIssnet({
      issuerId: issuer.id,
      environment: issuer.environment,
      cnpj: issuer.cnpj,
      chaveAcesso: invoice.accessKey,
      reason: input.reason,
    });
  } else {
    const client = buildNfseClient(issuer);
    const result = await client.cancelar({
      chaveAcesso: invoice.accessKey,
      autor: { CNPJ: issuer.cnpj },
      cMotivo: JustificativaCancelamento.Outros,
      xMotivo: input.reason,
    });

    if (result.status === "retry_pending") {
      throw new Error("cancel-retry-pending");
    }
  }

  await db.transaction(async (tx) => {
    await updateServiceInvoice(
      invoice.id,
      {
        status: "canceled",
        canceledAt: new Date(),
        cancelReason: input.reason,
      },
      tx,
    );

    await tx
      .update(accountsReceivable)
      .set({
        nfseStatus: "canceled",
        updatedAt: new Date(),
      })
      .where(eq(accountsReceivable.id, invoice.accountReceivableId));
  });

  return { success: true as const };
}

export async function updateIssuerProductionEnvironment(issuerId: string) {
  const issuer = await getIssuerById(issuerId);
  if (!issuer) {
    throw new Error("issuer-not-found");
  }

  if (issuer.environment === "producao") {
    return issuer;
  }

  const { updateIssuerEnvironment } = await import("@/server/dal/issuers");
  return updateIssuerEnvironment(issuerId, "producao");
}
