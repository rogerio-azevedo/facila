import { index, pgTable, text } from "drizzle-orm/pg-core";

export const cnaeCodes = pgTable(
  "cnae_codes",
  {
    code: text("code").primaryKey(),
    description: text("description").notNull(),
  },
  (table) => [index("cnae_codes_description_idx").on(table.description)],
);
