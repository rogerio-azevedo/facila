import { sql } from "drizzle-orm";
import {
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { billingRuns } from "./billing-runs";
import { clients } from "./clients";
import { companies } from "./companies";
import { contracts } from "./contracts";

export const accountReceivableStatusEnum = pgEnum("account_receivable_status", [
  "pending",
  "paid",
  "canceled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "pix",
  "boleto",
  "transfer",
  "cash",
  "credit_card",
  "debit_card",
  "other",
]);

export const accountsReceivable = pgTable(
  "accounts_receivable",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    contractId: uuid("contract_id").references(() => contracts.id, {
      onDelete: "restrict",
    }),
    billingRunId: uuid("billing_run_id").references(() => billingRuns.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    competenceDate: date("competence_date", { mode: "date" }).notNull(),
    issueDate: date("issue_date", { mode: "date" }).notNull(),
    dueDate: date("due_date", { mode: "date" }).notNull(),
    status: accountReceivableStatusEnum("status").notNull().default("pending"),
    paymentDate: date("payment_date", { mode: "date" }),
    paymentMethod: paymentMethodEnum("payment_method"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("accounts_receivable_company_id_idx").on(table.companyId),
    index("accounts_receivable_client_id_idx").on(table.clientId),
    index("accounts_receivable_contract_id_idx").on(table.contractId),
    index("accounts_receivable_billing_run_id_idx").on(table.billingRunId),
    index("accounts_receivable_company_competence_idx").on(
      table.companyId,
      table.competenceDate,
    ),
    index("accounts_receivable_company_status_idx").on(table.companyId, table.status),
    uniqueIndex("accounts_receivable_contract_competence_uidx")
      .on(table.contractId, table.competenceDate)
      .where(
        sql`${table.contractId} IS NOT NULL AND ${table.status} <> 'canceled'`,
      ),
  ],
);
