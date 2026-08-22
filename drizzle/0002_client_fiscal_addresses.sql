CREATE TYPE "public"."person_type" AS ENUM('individual', 'organization');--> statement-breakpoint
CREATE TYPE "public"."icms_taxpayer_indicator" AS ENUM('taxpayer', 'exempt', 'non_taxpayer');--> statement-breakpoint
CREATE TYPE "public"."address_owner_type" AS ENUM('company', 'client');--> statement-breakpoint
CREATE TYPE "public"."address_type" AS ENUM('main', 'billing', 'shipping');--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "person_type" "person_type";--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "document" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "legal_name" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "trade_name" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "state_registration" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "icms_taxpayer_indicator" "icms_taxpayer_indicator" DEFAULT 'non_taxpayer' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "municipal_registration" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "phone" text;--> statement-breakpoint
UPDATE "clients" SET "person_type" = 'individual', "document" = "id"::text WHERE "person_type" IS NULL;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "person_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "document" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "clients_company_document_idx" ON "clients" USING btree ("company_id","document");--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"owner_type" "address_owner_type" NOT NULL,
	"client_owner_id" uuid,
	"type" "address_type" DEFAULT 'main' NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"street" text NOT NULL,
	"number" text NOT NULL,
	"complement" text,
	"neighborhood" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"country" text DEFAULT 'Brasil' NOT NULL,
	"postal_code" text NOT NULL,
	"cod_municipio_ibge" text,
	"latitude" double precision,
	"longitude" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "addresses_owner_check" CHECK (("owner_type" = 'company' AND "client_owner_id" IS NULL) OR ("owner_type" = 'client' AND "client_owner_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_client_owner_id_clients_id_fk" FOREIGN KEY ("client_owner_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_company_id_idx" ON "addresses" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "addresses_client_owner_id_idx" ON "addresses" USING btree ("client_owner_id");
