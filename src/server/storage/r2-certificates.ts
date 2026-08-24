import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { decryptBuffer, encryptBuffer } from "@/server/security/certificate-crypto";
import {
  deleteLocalCertificateFile,
  readLocalCertificateFile,
  writeLocalCertificateFile,
} from "@/server/storage/local-certificates";
import { getR2Bucket, getR2Client, isR2Configured, R2_PREFIX } from "@/server/storage/r2-client";

const MAX_CERTIFICATE_SIZE_BYTES = 5 * 1024 * 1024;
const DOWNLOAD_URL_EXPIRES_IN = 600;

function useLocalCertificateStorage(): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  return !isR2Configured();
}

export function buildCertificateFileKey(
  companyId: string,
  issuerId: string,
  filename: string,
): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${R2_PREFIX.certificates}/${companyId}/${issuerId}/${Date.now()}_${safeName}.enc`;
}

export function buildNfseFileKey(
  companyId: string,
  serviceInvoiceId: string,
  kind: "dps" | "nfse" | "danfse",
  filename: string,
): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${R2_PREFIX.serviceInvoices}/${companyId}/${serviceInvoiceId}/${kind}/${Date.now()}_${safeName}`;
}

export function validateCertificateFile(file: File) {
  if (!file || file.size === 0) {
    throw new Error("file-required");
  }

  if (file.size > MAX_CERTIFICATE_SIZE_BYTES) {
    throw new Error("file-too-large");
  }

  const lowerName = file.name.toLowerCase();
  const isPfx =
    lowerName.endsWith(".pfx") ||
    lowerName.endsWith(".p12") ||
    file.type === "application/x-pkcs12";

  if (!isPfx) {
    throw new Error("file-not-pfx");
  }
}

export async function uploadEncryptedCertificate(params: {
  companyId: string;
  issuerId: string;
  file: File;
  previousKey?: string | null;
}): Promise<{ key: string; size: number }> {
  validateCertificateFile(params.file);

  const key = buildCertificateFileKey(params.companyId, params.issuerId, params.file.name);
  const raw = Buffer.from(await params.file.arrayBuffer());
  const encrypted = encryptBuffer(raw);

  if (useLocalCertificateStorage()) {
    await writeLocalCertificateFile(key, encrypted);

    if (params.previousKey && params.previousKey !== key) {
      try {
        await deleteLocalCertificateFile(params.previousKey);
      } catch {
        // Ignora falha ao remover arquivo antigo
      }
    }

    return { key, size: params.file.size };
  }

  const bucket = getR2Bucket();

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: encrypted,
      ContentType: "application/octet-stream",
    }),
  );

  if (params.previousKey && params.previousKey !== key) {
    try {
      await deleteCertificateFile(params.previousKey);
    } catch {
      // Ignora falha ao remover arquivo antigo
    }
  }

  return { key, size: params.file.size };
}

export async function readEncryptedCertificate(key: string): Promise<Buffer> {
  if (useLocalCertificateStorage()) {
    const encrypted = await readLocalCertificateFile(key);
    return decryptBuffer(encrypted);
  }

  const bucket = getR2Bucket();
  const response = await getR2Client().send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  const body = response.Body;

  if (!body) {
    throw new Error("certificate-not-found");
  }

  const encrypted = Buffer.from(await body.transformToByteArray());
  return decryptBuffer(encrypted);
}

export async function deleteCertificateFile(key: string): Promise<void> {
  if (useLocalCertificateStorage()) {
    await deleteLocalCertificateFile(key);
    return;
  }

  const bucket = getR2Bucket();

  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function uploadNfseFile(params: {
  companyId: string;
  serviceInvoiceId: string;
  kind: "dps" | "nfse" | "danfse";
  filename: string;
  body: Buffer | string;
  contentType: string;
}): Promise<string> {
  const bucket = getR2Bucket();
  const key = buildNfseFileKey(
    params.companyId,
    params.serviceInvoiceId,
    params.kind,
    params.filename,
  );

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: typeof params.body === "string" ? Buffer.from(params.body, "utf8") : params.body,
      ContentType: params.contentType,
    }),
  );

  return key;
}

export async function getNfseFileDownloadUrl(key: string): Promise<string> {
  const bucket = getR2Bucket();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(getR2Client(), command, {
    expiresIn: DOWNLOAD_URL_EXPIRES_IN,
  });
}

export async function readNfseFile(key: string): Promise<Buffer> {
  const bucket = getR2Bucket();
  const response = await getR2Client().send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  const body = response.Body;

  if (!body) {
    throw new Error("nfse-file-not-found");
  }

  return Buffer.from(await body.transformToByteArray());
}

export { MAX_CERTIFICATE_SIZE_BYTES, DOWNLOAD_URL_EXPIRES_IN };
