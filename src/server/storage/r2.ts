import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getR2Bucket, getR2Client, R2_PREFIX } from "@/server/storage/r2-client";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const DOWNLOAD_URL_EXPIRES_IN = 600;

export function buildContractFileKey(
  companyId: string,
  contractId: string,
  filename: string,
): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  return `${R2_PREFIX.contracts}/${companyId}/${contractId}/${timestamp}_${safeName}`;
}

export function validateContractPdfFile(file: File) {
  if (!file || file.size === 0) {
    throw new Error("file-required");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("file-too-large");
  }

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new Error("file-not-pdf");
  }
}

export async function uploadContractFile(params: {
  companyId: string;
  contractId: string;
  file: File;
  previousKey?: string | null;
}): Promise<{ key: string; size: number; mime: string }> {
  validateContractPdfFile(params.file);

  const bucket = getR2Bucket();
  const key = buildContractFileKey(params.companyId, params.contractId, params.file.name);
  const buffer = Buffer.from(await params.file.arrayBuffer());

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: "application/pdf",
    }),
  );

  if (params.previousKey && params.previousKey !== key) {
    try {
      await deleteContractFile(params.previousKey);
    } catch {
      // Ignora falha ao remover arquivo antigo
    }
  }

  return {
    key,
    size: params.file.size,
    mime: "application/pdf",
  };
}

export async function deleteContractFile(key: string): Promise<void> {
  const bucket = getR2Bucket();

  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function getContractFileDownloadUrl(key: string): Promise<string> {
  const bucket = getR2Bucket();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(getR2Client(), command, {
    expiresIn: DOWNLOAD_URL_EXPIRES_IN,
  });
}

export { MAX_FILE_SIZE_BYTES, DOWNLOAD_URL_EXPIRES_IN };
