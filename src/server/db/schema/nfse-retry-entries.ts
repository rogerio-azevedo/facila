import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const nfseRetryEntries = pgTable(
  "nfse_retry_entries",
  {
    id: text("id").primaryKey(),
    payload: text("payload").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("nfse_retry_entries_updated_at_idx").on(table.updatedAt)],
);
