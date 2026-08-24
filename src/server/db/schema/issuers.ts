import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { companies } from "./companies";
import { municipalities } from "./municipalities";

export const issuerStatusEnum = pgEnum("issuer_status", ["active", "inactive"]);

export const issuerEnvironmentEnum = pgEnum("issuer_environment", ["homologacao", "producao"]);

export const issuers = pgTable(
  "issuers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    legalName: text("legal_name").notNull(),
    tradeName: text("trade_name"),
    cnpj: text("cnpj").notNull(),
    municipalRegistration: text("municipal_registration"),
    stateRegistration: text("state_registration"),
    codMunicipioIbge: text("cod_municipio_ibge")
      .notNull()
      .references(() => municipalities.ibgeCode, { onDelete: "restrict" }),
    email: text("email"),
    phone: text("phone"),
    opSimpNac: text("op_simp_nac").notNull().default("1"),
    regApTribSn: text("reg_ap_trib_sn"),
    regEspTrib: text("reg_esp_trib").notNull().default("0"),
    incentivadorCultural: boolean("incentivador_cultural").notNull().default(false),
    dpsSeries: text("dps_series").notNull().default("1"),
    nextDpsNumber: integer("next_dps_number").notNull().default(1),
    environment: issuerEnvironmentEnum("environment").notNull().default("homologacao"),
    certificateFileKey: text("certificate_file_key"),
    certificateFileName: text("certificate_file_name"),
    certificateUploadedAt: timestamp("certificate_uploaded_at", { mode: "date" }),
    certificateExpiresAt: timestamp("certificate_expires_at", { mode: "date" }),
    certificateSubjectCn: text("certificate_subject_cn"),
    certificatePasswordCiphertext: text("certificate_password_ciphertext"),
    status: issuerStatusEnum("status").notNull().default("active"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("issuers_company_id_idx").on(table.companyId),
    uniqueIndex("issuers_company_cnpj_idx").on(table.companyId, table.cnpj),
    index("issuers_cod_municipio_ibge_idx").on(table.codMunicipioIbge),
  ],
);
