import { boolean, index, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { cnaeCodes } from "./cnae-codes";
import { issuers } from "./issuers";

export const issuerCnaes = pgTable(
  "issuer_cnaes",
  {
    issuerId: uuid("issuer_id")
      .notNull()
      .references(() => issuers.id, { onDelete: "cascade" }),
    cnaeCode: text("cnae_code")
      .notNull()
      .references(() => cnaeCodes.code, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.issuerId, table.cnaeCode] }),
    index("issuer_cnaes_cnae_code_idx").on(table.cnaeCode),
  ],
);
