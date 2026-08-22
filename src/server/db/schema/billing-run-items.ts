import { date, index, numeric, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { accountsReceivable } from "./accounts-receivable";
import { billingRuns } from "./billing-runs";
import { contracts } from "./contracts";

export const billingRunItemStatusEnum = pgEnum("billing_run_item_status", [
  "generated",
  "skipped",
  "error",
]);

export const billingRunItems = pgTable(
  "billing_run_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    billingRunId: uuid("billing_run_id")
      .notNull()
      .references(() => billingRuns.id, { onDelete: "cascade" }),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "restrict" }),
    status: billingRunItemStatusEnum("status").notNull(),
    skipReason: text("skip_reason"),
    errorMessage: text("error_message"),
    accountReceivableId: uuid("account_receivable_id").references(
      () => accountsReceivable.id,
      { onDelete: "set null" },
    ),
    amount: numeric("amount", { precision: 12, scale: 2 }),
    dueDate: date("due_date", { mode: "date" }),
  },
  (table) => [
    index("billing_run_items_billing_run_id_idx").on(table.billingRunId),
    index("billing_run_items_contract_id_idx").on(table.contractId),
  ],
);
