import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

let r2Client: S3Client | null = null;

/** Pastas (prefixos de key) dentro do bucket único R2_BUCKET_NAME */
export const R2_PREFIX = {
  contracts: "contracts",
  certificates: "certificates",
  serviceInvoices: "service_invoices",
  boletos: "boletos",
} as const;

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

function resolveBucketName(): string | undefined {
  return (
    process.env.R2_BUCKET_NAME?.trim() ??
    process.env.R2_CONTRACTS_BUCKET?.trim() ??
    process.env.R2_CERTIFICATES_BUCKET?.trim() ??
    process.env.R2_NFSE_BUCKET?.trim()
  );
}

export function isR2Configured(): boolean {
  const bucket = resolveBucketName();

  if (!bucket) {
    return false;
  }

  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey =
    process.env.R2_SECRET_ACCESS_KEY?.trim() ?? process.env.R2_ACCESS_SECRET_KEY?.trim();
  const hasEndpoint =
    Boolean(process.env.R2_ENDPOINT?.trim()) || Boolean(process.env.R2_ACCOUNT_ID?.trim());

  return Boolean(accessKeyId && secretAccessKey && hasEndpoint);
}

export function getR2Bucket(): string {
  const bucket = resolveBucketName();

  if (!bucket) {
    throw new Error("R2_BUCKET_NAME not configured");
  }

  return bucket;
}

/** @deprecated Use getR2Bucket() */
export function getContractsBucket(): string {
  return getR2Bucket();
}

export function getR2Client(): S3Client {
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
