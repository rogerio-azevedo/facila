import "server-only";

import https from "node:https";
import { URL } from "node:url";

import type { A1Certificate } from "open-nfse";

const NFSE_NS = "http://www.sped.fazenda.gov.br/nfse";
const SOAP_ENV_NS = "http://schemas.xmlsoap.org/soap/envelope/";

export type IssnetSoapMethod =
  | "ConsultarDadosCadastrais"
  | "GerarNfse"
  | "CancelarNfse";

export type IssnetSoapCallOptions = {
  endpoint: string;
  method: IssnetSoapMethod;
  nfseCabecMsg: string;
  nfseDadosMsg: string;
  certificate: A1Certificate;
  timeoutMs?: number;
};

export type IssnetSoapResponse = {
  statusCode: number;
  outputXml: string;
  rawBody: string;
};

const ISSNET_CUIABA_PRODUCAO =
  "https://wscuiaba.issnetonline.com.br/wsnfsenacional/nfse.asmx";
const ISSNET_HOMOLOGACAO =
  "https://nfse.issnetonline.com.br/wsnfsenacional/homologacao/nfse.asmx";

function buildSoapEnvelope(
  method: IssnetSoapMethod,
  nfseCabecMsg: string,
  nfseDadosMsg: string,
): string {
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:soap="${SOAP_ENV_NS}" xmlns:ws="${NFSE_NS}">` +
    `<soap:Body>` +
    `<ws:${method}>` +
    `<ws:nfseCabecMsg>${nfseCabecMsg}</ws:nfseCabecMsg>` +
    `<ws:nfseDadosMsg>${nfseDadosMsg}</ws:nfseDadosMsg>` +
    `</ws:${method}>` +
    `</soap:Body>` +
    `</soap:Envelope>`
  );
}

function extractOutputXml(soapBody: string): string {
  const cdataMatch = /<outputXML[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/outputXML>/i.exec(soapBody);
  if (cdataMatch?.[1]) {
    return cdataMatch[1].trim();
  }

  const escapedMatch = /<(?:\w+:)?outputXML[^>]*>([\s\S]*?)<\/(?:\w+:)?outputXML>/i.exec(
    soapBody,
  );
  if (escapedMatch?.[1]) {
    return escapedMatch[1]
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();
  }

  const responseMatch =
    /<(?:\w+:)?GerarNfseResposta>([\s\S]*?)<\/(?:\w+:)?GerarNfseResposta>/i.exec(
      soapBody,
    ) ??
    /<(?:\w+:)?CancelarNfseResposta>([\s\S]*?)<\/(?:\w+:)?CancelarNfseResposta>/i.exec(
      soapBody,
    ) ??
    /<(?:\w+:)?ConsultarDadosCadastraisResposta>([\s\S]*?)<\/(?:\w+:)?ConsultarDadosCadastraisResposta>/i.exec(
      soapBody,
    );

  if (responseMatch?.[1]) {
    return responseMatch[1].trim();
  }

  return soapBody.trim();
}

export function buildIssnetCabecalho(versao = "1.01"): string {
  return `<cabecalho versao="${versao}" xmlns="${NFSE_NS}"><versaoDados>${versao}</versaoDados></cabecalho>`;
}

export function resolveIssnetEndpoint(environment: "homologacao" | "producao"): string {
  const custom = process.env.NFSE_ISSNET_URL?.trim();
  if (custom) {
    return custom;
  }

  return environment === "producao" ? ISSNET_CUIABA_PRODUCAO : ISSNET_HOMOLOGACAO;
}

export function isIssnetLoginRedirect(response: IssnetSoapResponse): boolean {
  return (
    response.statusCode === 302 ||
    response.statusCode === 301 ||
    response.outputXml.includes("Login.aspx") ||
    response.outputXml.includes("Object moved") ||
    response.rawBody.includes("Login.aspx")
  );
}

export function isIssnetHttpError(response: IssnetSoapResponse): boolean {
  if (response.statusCode >= 400) {
    return true;
  }

  const xml = response.outputXml;
  return (
    xml.includes("<!DOCTYPE html") ||
    xml.includes("404 - Arquivo") ||
    xml.includes("Erro do Servidor")
  );
}

export async function callIssnetSoap(options: IssnetSoapCallOptions): Promise<IssnetSoapResponse> {
  const { endpoint, method, nfseCabecMsg, nfseDadosMsg, certificate, timeoutMs = 90_000 } =
    options;

  const url = new URL(endpoint);
  const path = `${url.pathname}${url.search}`;
  const soapAction = `${NFSE_NS}/${method}`;
  const body = buildSoapEnvelope(method, nfseCabecMsg, nfseDadosMsg);
  const agent = new https.Agent({
    cert: certificate.certPem,
    key: certificate.keyPem,
    rejectUnauthorized: true,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path,
        method: "POST",
        agent,
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: `"${soapAction}"`,
          "Content-Length": Buffer.byteLength(body, "utf8"),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const rawBody = Buffer.concat(chunks).toString("utf8");
          resolve({
            statusCode: res.statusCode ?? 0,
            outputXml: extractOutputXml(rawBody),
            rawBody,
          });
        });
      },
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`ISSNet SOAP timeout após ${timeoutMs}ms`));
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
