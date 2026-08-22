import crypto from "node:crypto";
import fs from "node:fs";

import postgres from "postgres";

const migrationsFolder = "drizzle";
const journal = JSON.parse(
  fs.readFileSync(`${migrationsFolder}/meta/_journal.json`, "utf8"),
);
const entry = journal.entries[0];

if (!entry) {
  throw new Error("Nenhuma migration encontrada em drizzle/meta/_journal.json");
}

const migrationPath = `${migrationsFolder}/${entry.tag}.sql`;
const sql = fs.readFileSync(migrationPath, "utf8");
const hash = crypto.createHash("sha256").update(sql).digest("hex");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const db = postgres(connectionString, { max: 1 });

try {
  await db`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await db`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;

  const [{ exists: hasUserTable }] = await db`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user'
    ) AS exists
  `;

  const applied = await db`
    SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = ${hash}
  `;

  if (applied.length > 0) {
    console.log("Migration inicial já registrada. Nada a fazer.");
    process.exit(0);
  }

  if (!hasUserTable) {
    console.log("Banco vazio — use npm run db:migrate em vez de baseline.");
    process.exit(1);
  }

  await db`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES (${hash}, ${entry.when})
  `;

  console.log(`Baseline OK: ${entry.tag} marcada como aplicada.`);
} finally {
  await db.end();
}
