import {
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { companies } from "./companies";
import { users } from "./auth";

export const billingRunStatusEnum = pgEnum("billing_run_status", [
  "completed",
  "partial_failed",
]);

export const billingRuns = pgTable(
  "billing_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    competenceDate: date("competence_date", { mode: "date" }).notNull(),
    status: billingRunStatusEnum("status").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    eligibleCount: integer("eligible_count").notNull().default(0),
    generatedCount: integer("generated_count").notNull().default(0),
    skippedCount: integer("skipped_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { mode: "date" }),
  },
  (table) => [
    index("billing_runs_company_id_idx").on(table.companyId),
    index("billing_runs_company_competence_idx").on(table.companyId, table.competenceDate),
  ],
);
