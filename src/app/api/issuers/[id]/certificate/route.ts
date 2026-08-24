import { NextResponse } from "next/server";

import {
  clearIssuerCertificate,
  getIssuerById,
  updateIssuerCertificateMeta,
} from "@/server/dal/issuers";
import { ForbiddenError } from "@/server/dal/context";
import { invalidateIssuerCertificateCache } from "@/server/nfse/certificate-provider";
import { decryptSecret, encryptSecret } from "@/server/security/certificate-crypto";
import {
  deleteCertificateFile,
  readEncryptedCertificate,
  uploadEncryptedCertificate,
  validateCertificateFile,
} from "@/server/storage/r2-certificates";
import { validateCertificatePasswordFromUpload } from "@/server/nfse/certificate-provider";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const issuer = await getIssuerById(id);

    if (!issuer) {
      return errorResponse("Emissor não encontrado", 404);
    }

    if (!issuer.certificateFileKey || !issuer.certificatePasswordCiphertext) {
      return errorResponse("Certificado não configurado", 404);
    }

    const part = new URL(request.url).searchParams.get("part");

    if (part === "password") {
      return NextResponse.json({
        password: decryptSecret(issuer.certificatePasswordCiphertext),
      });
    }

    const pfx = await readEncryptedCertificate(issuer.certificateFileKey);
    const fileName = issuer.certificateFileName ?? "certificado.pfx";

    return new NextResponse(new Uint8Array(pfx), {
      headers: {
        "Content-Type": "application/x-pkcs12",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return errorResponse("Sem permissão", 403);
    }

    if (error instanceof Error) {
      if (
        error.message === "R2 credentials not configured" ||
        error.message === "R2_BUCKET_NAME not configured"
      ) {
        return errorResponse("Armazenamento de certificados não configurado", 503);
      }
      if (error.message === "certificate-not-found") {
        return errorResponse("Arquivo do certificado não encontrado", 404);
      }
      if (error.message.includes("NFSE_CERT_ENCRYPTION_KEY")) {
        return errorResponse("Criptografia de certificados não configurada", 503);
      }
    }

    throw error;
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const issuer = await getIssuerById(id);

    if (!issuer) {
      return errorResponse("Emissor não encontrado", 404);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const password = String(formData.get("password") ?? "");

    if (!(file instanceof File)) {
      return errorResponse("Arquivo do certificado é obrigatório", 400);
    }

    if (!password) {
      return errorResponse("Senha do certificado é obrigatória", 400);
    }

    validateCertificateFile(file);

    const rawPfx = Buffer.from(await file.arrayBuffer());

    let metadata: { expiresAt: Date; subjectCn: string };
    try {
      metadata = await validateCertificatePasswordFromUpload(rawPfx, password);
    } catch {
      return errorResponse("Senha do certificado inválida ou arquivo corrompido", 400);
    }

    const uploaded = await uploadEncryptedCertificate({
      companyId: issuer.companyId,
      issuerId: issuer.id,
      file,
      previousKey: issuer.certificateFileKey,
    });

    await updateIssuerCertificateMeta(issuer.id, {
      certificateFileKey: uploaded.key,
      certificateFileName: file.name,
      certificateUploadedAt: new Date(),
      certificateExpiresAt: metadata.expiresAt,
      certificateSubjectCn: metadata.subjectCn,
      certificatePasswordCiphertext: encryptSecret(password),
    });

    invalidateIssuerCertificateCache(issuer.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return errorResponse("Sem permissão", 403);
    }

    if (error instanceof Error) {
      if (error.message === "file-required") {
        return errorResponse("Arquivo do certificado é obrigatório", 400);
      }
      if (error.message === "file-too-large") {
        return errorResponse("O arquivo deve ter no máximo 5 MB", 400);
      }
      if (error.message === "file-not-pfx") {
        return errorResponse("Apenas arquivos .pfx ou .p12 são permitidos", 400);
      }
      if (
        error.message === "R2 credentials not configured" ||
        error.message === "R2_BUCKET_NAME not configured"
      ) {
        return errorResponse("Armazenamento de certificados não configurado", 503);
      }
      if (error.message.includes("NFSE_CERT_ENCRYPTION_KEY")) {
        return errorResponse("Criptografia de certificados não configurada", 503);
      }
    }

    throw error;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const issuer = await getIssuerById(id);

    if (!issuer) {
      return errorResponse("Emissor não encontrado", 404);
    }

    if (issuer.certificateFileKey) {
      try {
        await deleteCertificateFile(issuer.certificateFileKey);
      } catch {
        // Ignora falha ao remover do R2
      }
    }

    await clearIssuerCertificate(issuer.id);
    invalidateIssuerCertificateCache(issuer.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return errorResponse("Sem permissão", 403);
    }

    throw error;
  }
}
