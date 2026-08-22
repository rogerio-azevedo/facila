import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { companies } from "./companies";

export const personTypeEnum = pgEnum("person_type", ["individual", "organization"]);

export const icmsTaxpayerIndicatorEnum = pgEnum("icms_taxpayer_indicator", [
  "taxpayer",
  "exempt",
  "non_taxpayer",
]);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    personType: personTypeEnum("person_type").notNull(),
    document: text("document").notNull(),
    legalName: text("legal_name"),
    tradeName: text("trade_name"),
    stateRegistration: text("state_registration"),
    icmsTaxpayerIndicator: icmsTaxpayerIndicatorEnum("icms_taxpayer_indicator")
      .notNull()
      .default("non_taxpayer"),
    municipalRegistration: text("municipal_registration"),
    email: text("email"),
    phone: text("phone"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("clients_company_id_idx").on(table.companyId),
    uniqueIndex("clients_company_document_idx").on(table.companyId, table.document),
  ],
);
