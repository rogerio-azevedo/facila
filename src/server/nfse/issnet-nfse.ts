import "server-only";

import {
  AmbienteGeradorEvento,
  JustificativaCancelamento,
  ReceitaRejectionError,
  TipoAmbiente,
  TipoAmbienteDps,
  buildCancelamentoXml,
  buildDps,
  buildDpsXml,
  parseNfseXml,
  signDpsXml,
  signPedRegEventoXml,
  type BuildDpsParams,
  type NfseEmitResult,
} from "open-nfse";

import { resolveIssnetCodMunicipioEmissao } from "@/lib/nfse-issnet";
import { IssuerCertificateProvider } from "@/server/nfse/certificate-provider";
import { buildIbsCbsFromProfile } from "@/server/nfse/build-ibs-cbs";
import {
  buildIssnetCabecalho,
  callIssnetSoap,
  isIssnetHttpError,
  isIssnetLoginRedirect,
  resolveIssnetEndpoint,
} from "@/server/nfse/issnet-soap";
import type { IssuerServiceProfileRecord } from "@/server/dal/issuer-service-profiles";

const NFSE_NS = "http://www.sped.fazenda.gov.br/nfse";

type NfseMensagemRetorno = {
  codigo?: string;
  mensagem?: string;
  correcao?: string;
};

function stripXmlDeclaration(xml: string): string {
  return xml.replace(/^<\?xml[^>]*\?>\s*/i, "").trim();
}

function wrapGerarNfseEnvio(signedDpsXml: string): string {
  return `<GerarNfseEnvio xmlns="${NFSE_NS}">${stripXmlDeclaration(signedDpsXml)}</GerarNfseEnvio>`;
}

function wrapCancelarNfseEnvio(signedPedRegEventoXml: string): string {
  return `<CancelarNfseEnvio xmlns="${NFSE_NS}">${stripXmlDeclaration(signedPedRegEventoXml)}</CancelarNfseEnvio>`;
}

function extractTag(xml: string, tag: string): string | undefined {
  const match = new RegExp(`<(?:\\w+:)?${tag}>([^<]*)</(?:\\w+:)?${tag}>`, "i").exec(xml);
  return match?.[1]?.trim();
}

function extractMensagensRetorno(
  xml: string,
  listaTag: "ListaMensagemRetorno" | "ListaMensagemAlertaRetorno",
): NfseMensagemRetorno[] {
  const listaMatch = new RegExp(
    `<(?:\\w+:)?${listaTag}>([\\s\\S]*?)</(?:\\w+:)?${listaTag}>`,
    "i",
  ).exec(xml);

  if (!listaMatch?.[1]) {
    return [];
  }

  const messages: NfseMensagemRetorno[] = [];
  const regex =
    /<(?:\w+:)?MensagemRetorno>[\s\S]*?<(?:\w+:)?Codigo>([^<]*)<\/(?:\w+:)?Codigo>[\s\S]*?<(?:\w+:)?Mensagem>([^<]*)<\/(?:\w+:)?Mensagem>(?:[\s\S]*?<(?:\w+:)?Correcao>([^<]*)<\/(?:\w+:)?Correcao>)?[\s\S]*?<\/(?:\w+:)?MensagemRetorno>/gi;

  for (const match of listaMatch[1].matchAll(regex)) {
    messages.push({
      codigo: match[1]?.trim(),
      mensagem: match[2]?.trim(),
      correcao: match[3]?.trim(),
    });
  }

  return messages;
}

function formatNfseMensagens(mensagens: NfseMensagemRetorno[]): string {
  return mensagens
    .map((mensagem) => {
      const text = mensagem.mensagem ?? "";
      const correcao = mensagem.correcao ? ` — ${mensagem.correcao}` : "";
      return mensagem.codigo ? `${mensagem.codigo}: ${text}${correcao}` : `${text}${correcao}`;
    })
    .join(" | ");
}

function normalizeChaveAcessoFromInfNFSeId(id: string): string | undefined {
  const digits = id.trim().replace(/^NFS/i, "").replace(/\D/g, "");
  return digits.length === 50 ? digits : undefined;
}

function extractChaveAcesso(xml: string): string | undefined {
  const fromTag = extractTag(xml, "chNFSe") ?? extractTag(xml, "chaveAcesso");
  if (fromTag) {
    const digits = fromTag.replace(/\D/g, "");
    return digits.length === 50 ? digits : fromTag;
  }

  const idMatch = /<(?:\w+:)?infNFSe\b[^>]*\bId="([^"]*)"/i.exec(xml);
  if (idMatch?.[1]) {
    return normalizeChaveAcessoFromInfNFSeId(idMatch[1]);
  }

  return undefined;
}

function extractNfseXml(xml: string): string | undefined {
  const match = /<(?:\w+:)?NFSe\b[^>]*>[\s\S]*<\/(?:\w+:)?NFSe>/i.exec(xml);
  return match?.[0]?.trim();
}

/**
 * O ISSNet costuma aninhar `<Signature>` em `<DPS>`; o parser nacional
 * exige `<Signature>` como filho direto de `<NFSe>`.
 */
function normalizeNfseXmlForParse(xml: string): string {
  const trimmed = xml.trim();

  if (!/<(?:\w+:)?NFSe\b/i.test(trimmed) || !/<\/(?:\w+:)?NFSe>\s*$/i.test(trimmed)) {
    return trimmed;
  }

  const hasRootSignature = /<(?:\w+:)?NFSe\b[^>]*>[\s\S]*<\/(?:\w+:)?infNFSe>\s*<(?:\w+:)?Signature\b/i.test(
    trimmed,
  );

  if (hasRootSignature) {
    return trimmed;
  }

  const signatureMatch =
    /<(?:\w+:)?Signature\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#"[\s\S]*?<\/(?:\w+:)?Signature>/i.exec(
      trimmed,
    ) ?? /<(?:\w+:)?Signature\b[\s\S]*?<\/(?:\w+:)?Signature>/i.exec(trimmed);

  if (!signatureMatch) {
    return trimmed;
  }

  const signatureXml = signatureMatch[0];
  const withoutClosing = trimmed.replace(/<\/(?:\w+:)?NFSe>\s*$/i, "");
  const bodyWithoutNestedSignature = withoutClosing.replace(signatureXml, "");

  return `${bodyWithoutNestedSignature}${signatureXml}</NFSe>`;
}

function throwIssnetRejection(mensagens: NfseMensagemRetorno[], idDps?: string): never {
  const mapped = mensagens
    .filter((item) => item.codigo || item.mensagem)
    .map((item) => ({
      codigo: item.codigo ?? "E0000",
      descricao: item.mensagem ?? "Rejeição ISSNet",
      complemento: item.correcao,
    }));

  throw new ReceitaRejectionError({
    mensagens:
      mapped.length > 0
        ? mapped
        : [{ codigo: "E0000", descricao: "NFS-e rejeitada pelo ISSNet." }],
    idDps,
  });
}

function applyIssnetMunicipalityOverride(
  buildParams: BuildDpsParams,
  environment: "homologacao" | "producao",
): BuildDpsParams {
  const codMunicipio = resolveIssnetCodMunicipioEmissao(
    buildParams.emitente.codMunicipio,
    environment,
  );

  if (codMunicipio === buildParams.emitente.codMunicipio) {
    return buildParams;
  }

  return {
    ...buildParams,
    emitente: {
      ...buildParams.emitente,
      codMunicipio,
    },
    servico: {
      ...buildParams.servico,
      codMunicipioPrestacao: codMunicipio,
    },
  };
}

async function assertIssnetSoapOk(response: {
  statusCode: number;
  outputXml: string;
  rawBody: string;
}) {
  if (isIssnetLoginRedirect(response)) {
    throw new Error(
      "O webservice ISSNet redirecionou para login. Solicite liberação do certificado em suporte@notaeletronica.com.br (CNPJ + IM).",
    );
  }

  if (isIssnetHttpError(response)) {
    throw new Error(`Falha no webservice ISSNet (HTTP ${response.statusCode}).`);
  }
}

export async function emitDpsViaIssnet(params: {
  issuerId: string;
  environment: "homologacao" | "producao";
  buildParams: BuildDpsParams;
  profile: IssuerServiceProfileRecord;
}): Promise<NfseEmitResult> {
  const buildParams = applyIssnetMunicipalityOverride(params.buildParams, params.environment);
  const dps = buildDps(buildParams);
  const dpsWithIbsCbs = buildParams.servico.cNBS
    ? {
        ...dps,
        infDPS: {
          ...dps.infDPS,
          IBSCBS: buildIbsCbsFromProfile(params.profile),
        },
      }
    : dps;

  const certificate = await new IssuerCertificateProvider(params.issuerId).load();
  const unsignedXml = buildDpsXml(dpsWithIbsCbs, { includeXmlDeclaration: false });
  const xmlDpsAssinado = signDpsXml(unsignedXml, certificate);
  const endpoint = resolveIssnetEndpoint(params.environment);
  const response = await callIssnetSoap({
    endpoint,
    method: "GerarNfse",
    nfseCabecMsg: buildIssnetCabecalho("1.01"),
    nfseDadosMsg: wrapGerarNfseEnvio(xmlDpsAssinado),
    certificate,
  });

  await assertIssnetSoapOk(response);

  const erros = extractMensagensRetorno(response.outputXml, "ListaMensagemRetorno");
  const alertas = extractMensagensRetorno(response.outputXml, "ListaMensagemAlertaRetorno");
  const idDps = dpsWithIbsCbs.infDPS.Id;

  if (erros.length > 0) {
    throwIssnetRejection(erros, idDps);
  }

  const xmlNfse = extractNfseXml(response.outputXml);
  if (!xmlNfse) {
    throwIssnetRejection(
      alertas.length > 0 ? alertas : [{ mensagem: "Resposta sem NFS-e gerada e sem mensagens de erro." }],
      idDps,
    );
  }

  const normalizedXml = normalizeNfseXmlForParse(xmlNfse);
  const nfse = parseNfseXml(normalizedXml);
  const chaveAcesso = extractChaveAcesso(normalizedXml) ?? nfse.infNFSe.chaveAcesso;

  return {
    chaveAcesso,
    idDps,
    xmlNfse: normalizedXml,
    nfse,
    alertas: alertas.map((item) => ({
      codigo: item.codigo ?? "",
      descricao: item.mensagem ?? "",
      complemento: item.correcao,
    })),
    tipoAmbiente:
      params.environment === "producao" ? TipoAmbiente.Producao : TipoAmbiente.Homologacao,
    versaoAplicativo: extractTag(normalizedXml, "verAplic") ?? "facila/1.0",
    dataHoraProcessamento: nfse.infNFSe.dhProc ?? new Date(),
  };
}

export async function cancelNfseViaIssnet(params: {
  issuerId: string;
  environment: "homologacao" | "producao";
  cnpj: string;
  chaveAcesso: string;
  reason: string;
}) {
  const certificate = await new IssuerCertificateProvider(params.issuerId).load();
  const unsignedXml = buildCancelamentoXml(
    {
      chaveAcesso: params.chaveAcesso.replace(/\D/g, ""),
      autor: { CNPJ: params.cnpj.replace(/\D/g, "") },
      cMotivo: JustificativaCancelamento.Outros,
      xMotivo: params.reason.trim(),
      tpAmb:
        params.environment === "producao"
          ? TipoAmbienteDps.Producao
          : TipoAmbienteDps.Homologacao,
      ambGer: AmbienteGeradorEvento.Prefeitura,
      verAplic: "facila/1.0",
    },
    { includeXmlDeclaration: false },
  );
  const signedXml = signPedRegEventoXml(unsignedXml, certificate);
  const response = await callIssnetSoap({
    endpoint: resolveIssnetEndpoint(params.environment),
    method: "CancelarNfse",
    nfseCabecMsg: buildIssnetCabecalho("1.01"),
    nfseDadosMsg: wrapCancelarNfseEnvio(signedXml),
    certificate,
  });

  await assertIssnetSoapOk(response);

  const erros = extractMensagensRetorno(response.outputXml, "ListaMensagemRetorno");
  const alreadyCanceled = erros.some((erro) => {
    const codigo = (erro.codigo ?? "").toUpperCase();
    const mensagem = (erro.mensagem ?? "").toLowerCase();
    return (
      codigo === "E0840" ||
      mensagem.includes("já está vinculado") ||
      mensagem.includes("ja esta vinculado") ||
      mensagem.includes("já cancelad") ||
      mensagem.includes("ja cancelad")
    );
  });

  if (erros.length > 0 && !alreadyCanceled) {
    throw new Error(formatNfseMensagens(erros) || "Cancelamento rejeitado pelo ISSNet.");
  }

  if (!alreadyCanceled && !/<(?:\w+:)?Evento\b/i.test(response.outputXml)) {
    throw new Error("Resposta sem confirmação de cancelamento e sem mensagens de erro.");
  }
}
