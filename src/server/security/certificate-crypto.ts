import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function loadKey(): Buffer {
  const raw = process.env.NFSE_CERT_ENCRYPTION_KEY?.trim();

  if (!raw) {
    if (process.env.NODE_ENV === "development") {
      return Buffer.from("facila-dev-only-cert-encryption!", "utf8");
    }

    throw new Error(
      "NFSE_CERT_ENCRYPTION_KEY não configurada. Gere com: openssl rand -base64 32",
    );
  }

  const key = Buffer.from(raw, "base64");

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `NFSE_CERT_ENCRYPTION_KEY inválida: esperado ${KEY_LENGTH} bytes em base64, recebido ${key.length}`,
    );
  }

  return key;
}

export function encryptSecret(plain: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("hex"), authTag.toString("hex"), ciphertext.toString("hex")].join(":");
}

export function decryptSecret(payload: string): string {
  const key = loadKey();
  const [ivHex, tagHex, ctHex] = payload.split(":");

  if (!ivHex || !tagHex || !ctHex) {
    throw new Error("Payload criptografado inválido.");
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  const plain = Buffer.concat([
    decipher.update(Buffer.from(ctHex, "hex")),
    decipher.final(),
  ]);

  return plain.toString("utf8");
}

export function encryptBuffer(data: Buffer): Buffer {
  const key = loadKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]);
}

export function decryptBuffer(payload: Buffer): Buffer {
  const key = loadKey();

  if (payload.length < IV_LENGTH + 16) {
    throw new Error("Payload criptografado inválido.");
  }

  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = payload.subarray(IV_LENGTH + 16);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
