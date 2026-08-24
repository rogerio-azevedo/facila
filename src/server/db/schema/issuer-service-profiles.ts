import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { cnaeCodes } from "./cnae-codes";
import { issuers } from "./issuers";
import { nationalServiceCodes } from "./national-service-codes";

export const issuerServiceProfiles = pgTable(
  "issuer_service_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issuerId: uuid("issuer_id")
      .notNull()
      .references(() => issuers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    cnaeCode: text("cnae_code")
      .notNull()
      .references(() => cnaeCodes.code, { onDelete: "restrict" }),
    nationalServiceCode: text("national_service_code")
      .notNull()
      .references(() => nationalServiceCodes.code, { onDelete: "restrict" }),
    issRate: numeric("iss_rate", { precision: 6, scale: 4 }).notNull(),
    issRetained: boolean("iss_retained").notNull().default(false),
    issqnCst: text("issqn_cst").notNull().default("000"),
    municipalTaxCode: text("municipal_tax_code"),
    nbsCode: text("nbs_code"),
    pTotTribSn: numeric("p_tot_trib_sn", { precision: 6, scale: 4 }),
    cClassTrib: text("c_class_trib"),
    cIndOp: text("c_ind_op"),
    indDest: text("ind_dest"),
    finNfse: text("fin_nfse"),
    indFinal: text("ind_final"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("issuer_service_profiles_issuer_id_idx").on(table.issuerId),
    index("issuer_service_profiles_cnae_code_idx").on(table.cnaeCode),
  ],
);
