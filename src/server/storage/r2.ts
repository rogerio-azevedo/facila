import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const DOWNLOAD_URL_EXPIRES_IN = 600;

let r2Client: S3Client | null = null;

function getR2Endpoint(): string {
  const endpoint = process.env.R2_ENDPOINT?.trim();

  if (endpoint) {
    return endpoint;
  }

  const accountId = process.env.R2_ACCOUNT_ID?.trim();

  if (accountId) {
    return `https://${accountId}.r2.cloudflarestorage.com`;
  }

  throw new Error("R2 credentials not configured");
}

function getR2Client(): S3Client {
  if (r2Client) {
    return r2Client;
  }

  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey =
    process.env.R2_SECRET_ACCESS_KEY?.trim() ?? process.env.R2_ACCESS_SECRET_KEY?.trim();

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials not configured");
  }

  r2Client = new S3Client({
    region: "auto",
    endpoint: getR2Endpoint(),
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return r2Client;
}

function getContractsBucket(): string {
  const bucket =
    process.env.R2_CONTRACTS_BUCKET?.trim() ?? process.env.R2_BUCKET_NAME?.trim();

  if (!bucket) {
    throw new Error("R2_CONTRACTS_BUCKET not configured");
  }

  return bucket;
}

export function buildContractFileKey(
  companyId: string,
  contractId: string,
  filename: string,
): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  return `contracts/${companyId}/${contractId}/${timestamp}_${safeName}`;
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

  const bucket = getContractsBucket();
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
  const bucket = getContractsBucket();

  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function getContractFileDownloadUrl(key: string): Promise<string> {
  const bucket = getContractsBucket();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(getR2Client(), command, {
    expiresIn: DOWNLOAD_URL_EXPIRES_IN,
  });
}

export { MAX_FILE_SIZE_BYTES, DOWNLOAD_URL_EXPIRES_IN };
