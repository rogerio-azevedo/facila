import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

const LOCAL_ROOT = path.join(process.cwd(), ".data", "certificates");

function resolveLocalPath(key: string): string {
  const normalized = key.replace(/^\/+/, "");
  const fullPath = path.join(LOCAL_ROOT, normalized);

  if (!fullPath.startsWith(LOCAL_ROOT)) {
    throw new Error("invalid-certificate-key");
  }

  return fullPath;
}

export async function writeLocalCertificateFile(key: string, data: Buffer): Promise<void> {
  const filePath = resolveLocalPath(key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
}

export async function readLocalCertificateFile(key: string): Promise<Buffer> {
  const filePath = resolveLocalPath(key);
  return fs.readFile(filePath);
}

export async function deleteLocalCertificateFile(key: string): Promise<void> {
  const filePath = resolveLocalPath(key);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}
