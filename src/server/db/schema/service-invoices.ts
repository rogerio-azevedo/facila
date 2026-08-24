import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { issuers } from "./issuers";

export const serviceInvoiceEnvironmentEnum = pgEnum("service_invoice_environment", [
  "homologacao",
  "producao",
]);

export const serviceInvoiceStatusEnum = pgEnum("service_invoice_status", [
  "pending",
  "authorized",
  "rejected",
  "canceled",
  "error",
  "pending_retry",
]);

export const serviceInvoices = pgTable(
  "service_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull(),
    issuerId: uuid("issuer_id")
      .notNull()
      .references(() => issuers.id, { onDelete: "restrict" }),
    accountReceivableId: uuid("account_receivable_id").notNull(),
    issuerServiceProfileId: uuid("issuer_service_profile_id").notNull(),
    dpsSeries: text("dps_series").notNull(),
    dpsNumber: integer("dps_number").notNull(),
    environment: serviceInvoiceEnvironmentEnum("environment").notNull(),
    status: serviceInvoiceStatusEnum("status").notNull().default("pending"),
    accessKey: text("access_key"),
    dpsXmlKey: text("dps_xml_key"),
    nfseXmlKey: text("nfse_xml_key"),
    danfseKey: text("danfse_key"),
    rejectionReason: text("rejection_reason"),
    canceledAt: timestamp("canceled_at", { mode: "date" }),
    cancelReason: text("cancel_reason"),
    authorizedAt: timestamp("authorized_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("service_invoices_company_id_idx").on(table.companyId),
    index("service_invoices_issuer_id_idx").on(table.issuerId),
    index("service_invoices_account_receivable_id_idx").on(table.accountReceivableId),
    index("service_invoices_access_key_idx").on(table.accessKey),
  ],
);
