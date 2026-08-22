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
import { clients } from "./clients";
import { companies } from "./companies";

export const contractStatusEnum = pgEnum("contract_status", [
  "active",
  "inactive",
  "suspended",
]);

export const readjustmentIndexEnum = pgEnum("readjustment_index", [
  "IPCA",
  "IGPM",
  "INPC",
]);

export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    startDate: date("start_date", { mode: "date" }).notNull(),
    endDate: date("end_date", { mode: "date" }),
    termMonths: integer("term_months"),
    dueDay: integer("due_day").notNull().default(10),
    readjustmentIndex: readjustmentIndexEnum("readjustment_index"),
    readjustmentMonth: integer("readjustment_month"),
    status: contractStatusEnum("status").notNull().default("active"),
    fileKey: text("file_key"),
    fileName: text("file_name"),
    fileSize: integer("file_size"),
    fileMime: text("file_mime"),
    fileUploadedAt: timestamp("file_uploaded_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("contracts_company_id_idx").on(table.companyId),
    index("contracts_client_id_idx").on(table.clientId),
    index("contracts_company_status_idx").on(table.companyId, table.status),
  ],
);
