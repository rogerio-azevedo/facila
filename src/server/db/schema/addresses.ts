import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { clients } from "./clients";
import { companies } from "./companies";
import { issuers } from "./issuers";

export const addressOwnerTypeEnum = pgEnum("address_owner_type", ["company", "client", "issuer"]);

export const addressTypeEnum = pgEnum("address_type", ["main", "billing", "shipping"]);

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    ownerType: addressOwnerTypeEnum("owner_type").notNull(),
    clientOwnerId: uuid("client_owner_id").references(() => clients.id, {
      onDelete: "cascade",
    }),
    issuerOwnerId: uuid("issuer_owner_id").references(() => issuers.id, {
      onDelete: "cascade",
    }),
    type: addressTypeEnum("type").notNull().default("main"),
    isPrimary: boolean("is_primary").notNull().default(true),
    street: text("street").notNull(),
    number: text("number").notNull(),
    complement: text("complement"),
    neighborhood: text("neighborhood").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    country: text("country").notNull().default("Brasil"),
    postalCode: text("postal_code").notNull(),
    codMunicipioIbge: text("cod_municipio_ibge"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("addresses_company_id_idx").on(table.companyId),
    index("addresses_client_owner_id_idx").on(table.clientOwnerId),
    index("addresses_issuer_owner_id_idx").on(table.issuerOwnerId),
    check(
      "addresses_owner_check",
      sql`(${table.ownerType} = 'company' AND ${table.clientOwnerId} IS NULL AND ${table.issuerOwnerId} IS NULL) OR (${table.ownerType} = 'client' AND ${table.clientOwnerId} IS NOT NULL AND ${table.issuerOwnerId} IS NULL) OR (${table.ownerType} = 'issuer' AND ${table.issuerOwnerId} IS NOT NULL AND ${table.clientOwnerId} IS NULL)`,
    ),
  ],
);
