import { index, pgTable, text } from "drizzle-orm/pg-core";

export const nationalServiceCodes = pgTable(
  "national_service_codes",
  {
    code: text("code").primaryKey(),
    description: text("description").notNull(),
    nbsCode: text("nbs_code"),
  },
  (table) => [
    index("national_service_codes_description_idx").on(table.description),
    index("national_service_codes_nbs_idx").on(table.nbsCode),
  ],
);
