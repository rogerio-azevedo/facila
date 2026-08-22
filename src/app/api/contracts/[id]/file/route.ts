import { NextResponse } from "next/server";

import {
  clearContractFileMeta,
  getContractById,
  updateContractFileMeta,
} from "@/server/dal/contracts";
import { ForbiddenError } from "@/server/dal/context";
import {
  deleteContractFile,
  getContractFileDownloadUrl,
  uploadContractFile,
} from "@/server/storage/r2";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const contract = await getContractById(id);

    if (!contract) {
      return errorResponse("Contrato não encontrado", 404);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return errorResponse("Arquivo do contrato é obrigatório", 400);
    }

    const uploaded = await uploadContractFile({
      companyId: contract.companyId,
      contractId: contract.id,
      file,
      previousKey: contract.fileKey,
    });

    await updateContractFileMeta(contract.id, {
      fileKey: uploaded.key,
      fileName: file.name,
      fileSize: uploaded.size,
      fileMime: uploaded.mime,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return errorResponse("Sem permissão", 403);
    }

    if (error instanceof Error) {
      if (error.message === "file-required") {
        return errorResponse("Arquivo do contrato é obrigatório", 400);
      }
      if (error.message === "file-too-large") {
        return errorResponse("O arquivo deve ter no máximo 20 MB", 400);
      }
      if (error.message === "file-not-pdf") {
        return errorResponse("Apenas arquivos PDF são permitidos", 400);
      }
      if (error.message === "R2 credentials not configured" || error.message === "R2_CONTRACTS_BUCKET not configured") {
        return errorResponse("Armazenamento de contratos não configurado", 503);
      }
    }

    throw error;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const contract = await getContractById(id);

    if (!contract) {
      return errorResponse("Contrato não encontrado", 404);
    }

    if (contract.fileKey) {
      try {
        await deleteContractFile(contract.fileKey);
      } catch {
        // Ignora falha ao remover do R2
      }
    }

    await clearContractFileMeta(contract.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return errorResponse("Sem permissão", 403);
    }

    throw error;
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const contract = await getContractById(id);

    if (!contract) {
      return errorResponse("Contrato não encontrado", 404);
    }

    if (!contract.fileKey) {
      return errorResponse("Nenhum contrato anexado", 404);
    }

    const url = await getContractFileDownloadUrl(contract.fileKey);
    return NextResponse.redirect(url);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return errorResponse("Sem permissão", 403);
    }

    if (error instanceof Error) {
      if (error.message === "R2 credentials not configured" || error.message === "R2_CONTRACTS_BUCKET not configured") {
        return errorResponse("Armazenamento de contratos não configurado", 503);
      }
    }

    throw error;
  }
}
