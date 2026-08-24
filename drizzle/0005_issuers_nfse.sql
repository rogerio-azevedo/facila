CREATE TYPE "public"."municipality_nfse_status" AS ENUM('not_started', 'homologating', 'live');--> statement-breakpoint
CREATE TYPE "public"."issuer_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."issuer_environment" AS ENUM('homologacao', 'producao');--> statement-breakpoint
CREATE TYPE "public"."service_invoice_environment" AS ENUM('homologacao', 'producao');--> statement-breakpoint
CREATE TYPE "public"."service_invoice_status" AS ENUM('pending', 'authorized', 'rejected', 'canceled', 'error', 'pending_retry');--> statement-breakpoint
CREATE TYPE "public"."account_receivable_nfse_status" AS ENUM('none', 'pending', 'authorized', 'rejected', 'error', 'canceled');--> statement-breakpoint
CREATE TABLE "municipalities" (
	"ibge_code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"uf" text NOT NULL,
	"nfse_status" "municipality_nfse_status" DEFAULT 'not_started' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cnae_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "national_service_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"nbs_code" text
);
--> statement-breakpoint
CREATE TABLE "issuers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"legal_name" text NOT NULL,
	"trade_name" text,
	"cnpj" text NOT NULL,
	"municipal_registration" text,
	"state_registration" text,
	"cod_municipio_ibge" text NOT NULL,
	"email" text,
	"phone" text,
	"op_simp_nac" text DEFAULT '1' NOT NULL,
	"reg_ap_trib_sn" text,
	"reg_esp_trib" text DEFAULT '0' NOT NULL,
	"incentivador_cultural" boolean DEFAULT false NOT NULL,
	"dps_series" text DEFAULT '1' NOT NULL,
	"next_dps_number" integer DEFAULT 1 NOT NULL,
	"environment" "issuer_environment" DEFAULT 'homologacao' NOT NULL,
	"certificate_file_key" text,
	"certificate_file_name" text,
	"certificate_uploaded_at" timestamp,
	"certificate_expires_at" timestamp,
	"certificate_subject_cn" text,
	"certificate_password_ciphertext" text,
	"status" "issuer_status" DEFAULT 'active' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issuer_cnaes" (
	"issuer_id" uuid NOT NULL,
	"cnae_code" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "issuer_cnaes_issuer_id_cnae_code_pk" PRIMARY KEY("issuer_id","cnae_code")
);
--> statement-breakpoint
CREATE TABLE "issuer_service_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issuer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cnae_code" text NOT NULL,
	"national_service_code" text NOT NULL,
	"iss_rate" numeric(6, 4) NOT NULL,
	"iss_retained" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"issuer_id" uuid NOT NULL,
	"account_receivable_id" uuid NOT NULL,
	"issuer_service_profile_id" uuid NOT NULL,
	"dps_series" text NOT NULL,
	"dps_number" integer NOT NULL,
	"environment" "service_invoice_environment" NOT NULL,
	"status" "service_invoice_status" DEFAULT 'pending' NOT NULL,
	"access_key" text,
	"dps_xml_key" text,
	"nfse_xml_key" text,
	"danfse_key" text,
	"rejection_reason" text,
	"canceled_at" timestamp,
	"cancel_reason" text,
	"authorized_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nfse_retry_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"payload" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TYPE "public"."address_owner_type" ADD VALUE 'issuer';--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "issuer_owner_id" uuid;--> statement-breakpoint
ALTER TABLE "addresses" DROP CONSTRAINT "addresses_owner_check";--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_owner_check" CHECK (("owner_type" = 'company' AND "client_owner_id" IS NULL AND "issuer_owner_id" IS NULL) OR ("owner_type" = 'client' AND "client_owner_id" IS NOT NULL AND "issuer_owner_id" IS NULL) OR ("owner_type" = 'issuer' AND "issuer_owner_id" IS NOT NULL AND "client_owner_id" IS NULL));--> statement-breakpoint
ALTER TABLE "accounts_receivable" ADD COLUMN "issuer_id" uuid;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ADD COLUMN "issuer_service_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ADD COLUMN "nfse_status" "account_receivable_nfse_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ADD COLUMN "active_service_invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "issuers" ADD CONSTRAINT "issuers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuers" ADD CONSTRAINT "issuers_cod_municipio_ibge_municipalities_ibge_code_fk" FOREIGN KEY ("cod_municipio_ibge") REFERENCES "public"."municipalities"("ibge_code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuer_cnaes" ADD CONSTRAINT "issuer_cnaes_issuer_id_issuers_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."issuers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuer_cnaes" ADD CONSTRAINT "issuer_cnaes_cnae_code_cnae_codes_code_fk" FOREIGN KEY ("cnae_code") REFERENCES "public"."cnae_codes"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuer_service_profiles" ADD CONSTRAINT "issuer_service_profiles_issuer_id_issuers_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."issuers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuer_service_profiles" ADD CONSTRAINT "issuer_service_profiles_cnae_code_cnae_codes_code_fk" FOREIGN KEY ("cnae_code") REFERENCES "public"."cnae_codes"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuer_service_profiles" ADD CONSTRAINT "issuer_service_profiles_national_service_code_national_service_codes_code_fk" FOREIGN KEY ("national_service_code") REFERENCES "public"."national_service_codes"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_issuer_id_issuers_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."issuers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_issuer_owner_id_issuers_id_fk" FOREIGN KEY ("issuer_owner_id") REFERENCES "public"."issuers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_issuer_id_issuers_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."issuers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_issuer_service_profile_id_issuer_service_profiles_id_fk" FOREIGN KEY ("issuer_service_profile_id") REFERENCES "public"."issuer_service_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_active_service_invoice_id_service_invoices_id_fk" FOREIGN KEY ("active_service_invoice_id") REFERENCES "public"."service_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "municipalities_uf_idx" ON "municipalities" USING btree ("uf");--> statement-breakpoint
CREATE INDEX "municipalities_name_idx" ON "municipalities" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "municipalities_name_uf_idx" ON "municipalities" USING btree ("name","uf");--> statement-breakpoint
CREATE INDEX "cnae_codes_description_idx" ON "cnae_codes" USING btree ("description");--> statement-breakpoint
CREATE INDEX "national_service_codes_description_idx" ON "national_service_codes" USING btree ("description");--> statement-breakpoint
CREATE INDEX "national_service_codes_nbs_idx" ON "national_service_codes" USING btree ("nbs_code");--> statement-breakpoint
CREATE INDEX "issuers_company_id_idx" ON "issuers" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "issuers_company_cnpj_idx" ON "issuers" USING btree ("company_id","cnpj");--> statement-breakpoint
CREATE INDEX "issuers_cod_municipio_ibge_idx" ON "issuers" USING btree ("cod_municipio_ibge");--> statement-breakpoint
CREATE INDEX "issuer_cnaes_cnae_code_idx" ON "issuer_cnaes" USING btree ("cnae_code");--> statement-breakpoint
CREATE INDEX "issuer_service_profiles_issuer_id_idx" ON "issuer_service_profiles" USING btree ("issuer_id");--> statement-breakpoint
CREATE INDEX "issuer_service_profiles_cnae_code_idx" ON "issuer_service_profiles" USING btree ("cnae_code");--> statement-breakpoint
CREATE INDEX "service_invoices_company_id_idx" ON "service_invoices" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "service_invoices_issuer_id_idx" ON "service_invoices" USING btree ("issuer_id");--> statement-breakpoint
CREATE INDEX "service_invoices_account_receivable_id_idx" ON "service_invoices" USING btree ("account_receivable_id");--> statement-breakpoint
CREATE INDEX "service_invoices_access_key_idx" ON "service_invoices" USING btree ("access_key");--> statement-breakpoint
CREATE INDEX "nfse_retry_entries_updated_at_idx" ON "nfse_retry_entries" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "addresses_issuer_owner_id_idx" ON "addresses" USING btree ("issuer_owner_id");
