import { index, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

export const municipalityNfseStatusEnum = pgEnum("municipality_nfse_status", [
  "not_started",
  "homologating",
  "live",
]);

export const municipalities = pgTable(
  "municipalities",
  {
    ibgeCode: text("ibge_code").primaryKey(),
    name: text("name").notNull(),
    uf: text("uf").notNull(),
    nfseStatus: municipalityNfseStatusEnum("nfse_status").notNull().default("not_started"),
  },
  (table) => [
    index("municipalities_uf_idx").on(table.uf),
    index("municipalities_name_idx").on(table.name),
    uniqueIndex("municipalities_name_uf_idx").on(table.name, table.uf),
  ],
);
