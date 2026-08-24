import { NextResponse } from "next/server";

import { getServiceInvoiceById } from "@/server/dal/service-invoices";
import { ForbiddenError } from "@/server/dal/context";
import { getNfseFileDownloadUrl } from "@/server/storage/r2-certificates";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const invoice = await getServiceInvoiceById(id);

    if (!invoice) {
      return errorResponse("Nota não encontrada", 404);
    }

    const url = new URL(request.url);
    const kind = url.searchParams.get("kind");

    const key =
      kind === "dps"
        ? invoice.dpsXmlKey
        : kind === "danfse"
          ? invoice.danfseKey
          : invoice.nfseXmlKey;

    if (!key) {
      return errorResponse("Arquivo não disponível", 404);
    }

    const downloadUrl = await getNfseFileDownloadUrl(key);
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return errorResponse("Sem permissão", 403);
    }

    throw error;
  }
}
