import "server-only";

import {
  buildConsultarDadosCadastraisEnvio,
  parseConsultarDadosCadastraisResposta,
  type NfseAtividadeCadastro,
} from "@/server/nfse/consultar-dados-cadastrais";
import { IssuerCertificateProvider } from "@/server/nfse/certificate-provider";
import {
  buildIssnetCabecalho,
  callIssnetSoap,
  isIssnetHttpError,
  isIssnetLoginRedirect,
  resolveIssnetEndpoint,
} from "@/server/nfse/issnet-soap";
import { getIssuerById } from "@/server/dal/issuers";
import type {
  ConsultarCadastroMunicipalResult,
  MunicipalCadastroActivity,
} from "@/schemas/municipal-cadastro";
import { CUIABA_IBGE } from "@/lib/nfse-issnet";

function mapAtividade(activity: NfseAtividadeCadastro): MunicipalCadastroActivity | null {
  const cTribMun = activity.cTribMun?.trim();
  if (!cTribMun) {
    return null;
  }

  return {
    cTribMun,
    xTribMun: activity.xTribMun?.trim() || undefined,
    pAliq: activity.pAliq?.trim() || undefined,
  };
}

export async function consultarCadastroMunicipalIssuer(
  issuerId: string,
): Promise<ConsultarCadastroMunicipalResult> {
  const issuer = await getIssuerById(issuerId);

  if (!issuer) {
    return { success: false, message: "Emissor não encontrado." };
  }

  if (issuer.codMunicipioIbge !== CUIABA_IBGE) {
    return {
      success: false,
      message: "Consulta de cadastro municipal disponível apenas para emissores de Cuiabá.",
    };
  }

  if (!issuer.municipalRegistration?.trim()) {
    return {
      success: false,
      message: "Informe a inscrição municipal (IM) no cadastro do emissor.",
    };
  }

  if (!issuer.certificateFileKey || !issuer.certificatePasswordCiphertext) {
    return {
      success: false,
      message: "Configure o certificado digital A1 do emissor antes de consultar o cadastro.",
    };
  }

  const certificate = await new IssuerCertificateProvider(issuerId).load();
  const endpoint = resolveIssnetEndpoint(issuer.environment);
  const cabecMsg = buildIssnetCabecalho("1.01");
  const dadosMsg = buildConsultarDadosCadastraisEnvio({
    cnpj: issuer.cnpj,
    inscricaoMunicipal: issuer.municipalRegistration,
  });

  const response = await callIssnetSoap({
    endpoint,
    method: "ConsultarDadosCadastrais",
    nfseCabecMsg: cabecMsg,
    nfseDadosMsg: dadosMsg,
    certificate,
  });

  if (isIssnetLoginRedirect(response)) {
    return {
      success: false,
      message:
        "O webservice ISSNet redirecionou para login. Solicite liberação do certificado em suporte@notaeletronica.com.br (CNPJ + IM).",
    };
  }

  if (isIssnetHttpError(response)) {
    return {
      success: false,
      message: `Falha ao consultar cadastro municipal (HTTP ${response.statusCode}).`,
    };
  }

  const parsed = parseConsultarDadosCadastraisResposta(response.outputXml);

  if (parsed.mensagens.length > 0 && !parsed.cadastro) {
    const detail = parsed.mensagens
      .map((item) => [item.codigo, item.mensagem].filter(Boolean).join(" — "))
      .join("; ");

    return {
      success: false,
      message: detail || "Cadastro municipal rejeitou a consulta.",
    };
  }

  const atividades = (parsed.cadastro?.atividades ?? [])
    .map(mapAtividade)
    .filter((item): item is MunicipalCadastroActivity => item !== null);

  if (atividades.length === 0) {
    return {
      success: false,
      message: "Nenhuma atividade ISS encontrada no cadastro municipal.",
    };
  }

  return {
    success: true,
    statusCadastro: parsed.cadastro?.statusCadastro,
    xNome: parsed.cadastro?.xNome,
    atividades,
  };
}
