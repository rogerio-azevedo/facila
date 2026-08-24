import type { ReceitaRejectionError } from "open-nfse";

type ReceitaMensagem = {
  codigo: string;
  descricao: string;
  complemento?: string;
};

export function formatReceitaRejectionMessages(
  mensagens: readonly ReceitaMensagem[],
): string {
  if (mensagens.length === 0) {
    return "";
  }

  return mensagens
    .map((mensagem) => {
      const text = mensagem.descricao ?? "";
      const complemento = mensagem.complemento ? ` — ${mensagem.complemento}` : "";
      return mensagem.codigo
        ? `[${mensagem.codigo}] ${text}${complemento}`
        : `${text}${complemento}`;
    })
    .join(" | ");
}

export function formatReceitaRejectionError(error: ReceitaRejectionError): string {
  return formatReceitaRejectionMessages(error.mensagens);
}
