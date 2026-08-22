CREATE TYPE "public"."contract_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."readjustment_index" AS ENUM('IPCA', 'IGPM', 'INPC');--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"amount" numeric(12, 2) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"term_months" integer,
	"due_day" integer DEFAULT 10 NOT NULL,
	"readjustment_index" "readjustment_index",
	"readjustment_month" integer,
	"status" "contract_status" DEFAULT 'active' NOT NULL,
	"file_key" text,
	"file_name" text,
	"file_size" integer,
	"file_mime" text,
	"file_uploaded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contracts_company_id_idx" ON "contracts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "contracts_client_id_idx" ON "contracts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "contracts_company_status_idx" ON "contracts" USING btree ("company_id","status");
