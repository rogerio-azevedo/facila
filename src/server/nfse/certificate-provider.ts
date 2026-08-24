import "server-only";

import type { A1Certificate, CertificateProvider } from "open-nfse";

import { decryptSecret } from "@/server/security/certificate-crypto";
import { getIssuerById } from "@/server/dal/issuers";
import { readEncryptedCertificate } from "@/server/storage/r2-certificates";
import { parsePfx } from "open-nfse";

type CachedCertificate = {
  uploadedAt: Date | null;
  certificate: A1Certificate;
};

const cache = new Map<string, CachedCertificate>();

export class IssuerCertificateProvider implements CertificateProvider {
  constructor(private readonly issuerId: string) {}

  async load(): Promise<A1Certificate> {
    const issuer = await getIssuerById(this.issuerId);

    if (!issuer?.certificateFileKey || !issuer.certificatePasswordCiphertext) {
      throw new Error("certificate-not-configured");
    }

    const cached = cache.get(this.issuerId);
    if (
      cached &&
      cached.uploadedAt?.getTime() === issuer.certificateUploadedAt?.getTime()
    ) {
      return cached.certificate;
    }

    const encryptedPfx = await readEncryptedCertificate(issuer.certificateFileKey);
    const password = decryptSecret(issuer.certificatePasswordCiphertext);
    const certificate = parsePfx(encryptedPfx, password);

    cache.set(this.issuerId, {
      uploadedAt: issuer.certificateUploadedAt,
      certificate,
    });

    return certificate;
  }
}

export function invalidateIssuerCertificateCache(issuerId: string) {
  cache.delete(issuerId);
}

export async function parseIssuerCertificate(
  issuerId: string,
  password: string,
): Promise<{ expiresAt: Date; subjectCn: string }> {
  const issuer = await getIssuerById(issuerId);

  if (!issuer?.certificateFileKey) {
    throw new Error("certificate-not-uploaded");
  }

  const encryptedPfx = await readEncryptedCertificate(issuer.certificateFileKey);
  const parsed = parsePfx(encryptedPfx, password);

  return {
    expiresAt: parsed.expiresOn,
    subjectCn: parsed.subject,
  };
}

export async function validateCertificatePasswordFromUpload(
  pfxBuffer: Buffer,
  password: string,
): Promise<{ expiresAt: Date; subjectCn: string }> {
  const parsed = parsePfx(pfxBuffer, password);

  return {
    expiresAt: parsed.expiresOn,
    subjectCn: parsed.subject,
  };
}
