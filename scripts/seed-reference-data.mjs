import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const db = postgres(connectionString, { max: 1 });

function readJson(filename) {
  const filePath = path.join(dataDir, filename);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function seedMunicipalities() {
  const items = readJson("municipalities.json");
  const rows = items.map((item) => ({
    ibge_code: item.ibgeCode,
    name: item.name,
    uf: item.uf,
    nfse_status: item.nfseStatus,
  }));
  const chunkSize = 500;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    await db`
      INSERT INTO municipalities ${db(chunk)}
      ON CONFLICT (ibge_code) DO UPDATE SET
        name = EXCLUDED.name,
        uf = EXCLUDED.uf,
        nfse_status = EXCLUDED.nfse_status
    `;
  }

  console.log(`Municipalities seeded: ${items.length}`);
}

async function seedCnaeCodes() {
  const items = readJson("cnae-codes.json");

  await db`
    INSERT INTO cnae_codes ${db(items)}
    ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description
  `;

  console.log(`CNAE codes seeded: ${items.length}`);
}

async function seedNationalServiceCodes() {
  const items = readJson("national-service-codes.json");
  const rows = items.map((item) => ({
    code: item.code,
    description: item.description,
    nbs_code: item.nbsCode ?? null,
  }));

  await db`
    INSERT INTO national_service_codes ${db(rows)}
    ON CONFLICT (code) DO UPDATE SET
      description = EXCLUDED.description,
      nbs_code = EXCLUDED.nbs_code
  `;

  console.log(`National service codes seeded: ${items.length}`);
}

try {
  await seedMunicipalities();
  await seedCnaeCodes();
  await seedNationalServiceCodes();
  console.log("Reference data seed completed.");
} finally {
  await db.end();
}
