import "server-only";

const NFSE_NS = "http://www.sped.fazenda.gov.br/nfse";

export type ConsultarDadosCadastraisInput = {
  cnpj: string;
  inscricaoMunicipal: string;
};

export type NfseAtividadeCadastro = {
  cTribMun?: string;
  xTribMun?: string;
  pAliq?: string;
};

export type NfseDadosCadastrais = {
  cnpj?: string;
  im?: string;
  statusCadastro?: string;
  xNome?: string;
  xFant?: string;
  cMun?: string;
  cep?: string;
  emiteNfse?: string;
  permiteTributarFora?: string;
  optanteSimplesNacional?: string;
  optanteMei?: string;
  atividades: NfseAtividadeCadastro[];
  tributacoesPermitidas: string[];
};

export type ConsultarDadosCadastraisResult = {
  cadastro?: NfseDadosCadastrais;
  mensagens: Array<{ codigo?: string; mensagem?: string; correcao?: string }>;
  rawXml: string;
};

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function buildConsultarDadosCadastraisEnvio(input: ConsultarDadosCadastraisInput): string {
  const cnpj = normalizeDigits(input.cnpj);
  const im = input.inscricaoMunicipal.trim();

  return (
    `<ConsultarDadosCadastraisEnvio xmlns="${NFSE_NS}">` +
    `<Prestador><CNPJ>${cnpj}</CNPJ><IM>${im}</IM></Prestador>` +
    `</ConsultarDadosCadastraisEnvio>`
  );
}

function extractTag(xml: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i").exec(xml);
  return match?.[1]?.trim();
}

function extractAllTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, "gi");
  return [...xml.matchAll(regex)].map((match) => match[1]?.trim() ?? "");
}

function extractCadastroBlock(xml: string): string | undefined {
  const match = /<Cadastro>([\s\S]*?)<\/Cadastro>/i.exec(xml);
  return match?.[1];
}

function extractMensagensRetorno(xml: string) {
  const messages: Array<{ codigo?: string; mensagem?: string; correcao?: string }> = [];
  const regex =
    /<MensagemRetorno>[\s\S]*?<Codigo>([^<]*)<\/Codigo>[\s\S]*?<Mensagem>([^<]*)<\/Mensagem>(?:[\s\S]*?<Correcao>([^<]*)<\/Correcao>)?[\s\S]*?<\/MensagemRetorno>/gi;

  for (const match of xml.matchAll(regex)) {
    messages.push({
      codigo: match[1]?.trim(),
      mensagem: match[2]?.trim(),
      correcao: match[3]?.trim(),
    });
  }

  return messages;
}

function extractAtividades(cadastroXml: string): NfseAtividadeCadastro[] {
  const atividades: NfseAtividadeCadastro[] = [];
  const regex = /<Atividade>([\s\S]*?)<\/Atividade>/gi;

  for (const match of cadastroXml.matchAll(regex)) {
    const block = match[1] ?? "";
    atividades.push({
      cTribMun: extractTag(block, "cTribMun"),
      xTribMun: extractTag(block, "xTribMun"),
      pAliq: extractTag(block, "pAliq"),
    });
  }

  return atividades;
}

export function parseConsultarDadosCadastraisResposta(xml: string): ConsultarDadosCadastraisResult {
  const mensagens = extractMensagensRetorno(xml);
  const cadastroXml = extractCadastroBlock(xml);

  if (!cadastroXml) {
    return { mensagens, rawXml: xml };
  }

  const enderNacMatch = /<enderNac>([\s\S]*?)<\/enderNac>/i.exec(cadastroXml);
  const enderNac = enderNacMatch?.[1] ?? "";

  const cadastro: NfseDadosCadastrais = {
    cnpj: extractTag(cadastroXml, "CNPJ"),
    im: extractTag(cadastroXml, "IM"),
    statusCadastro: extractTag(cadastroXml, "StatusCadastro"),
    xNome: extractTag(cadastroXml, "xNome"),
    xFant: extractTag(cadastroXml, "xFant"),
    cMun: extractTag(enderNac, "cMun"),
    cep: extractTag(enderNac, "CEP"),
    emiteNfse: extractTag(cadastroXml, "EmiteNfse"),
    permiteTributarFora: extractTag(cadastroXml, "PermiteTributarFora"),
    optanteSimplesNacional: extractTag(cadastroXml, "OptanteSimplesNacional"),
    optanteMei: extractTag(cadastroXml, "OptanteMEI"),
    atividades: extractAtividades(cadastroXml),
    tributacoesPermitidas: extractAllTags(cadastroXml, "tribISSQN"),
  };

  return { cadastro, mensagens, rawXml: xml };
}
