CREATE TYPE "public"."billing_run_status" AS ENUM('completed', 'partial_failed');--> statement-breakpoint
CREATE TYPE "public"."account_receivable_status" AS ENUM('pending', 'paid', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('pix', 'boleto', 'transfer', 'cash', 'credit_card', 'debit_card', 'other');--> statement-breakpoint
CREATE TYPE "public"."billing_run_item_status" AS ENUM('generated', 'skipped', 'error');--> statement-breakpoint
CREATE TABLE "billing_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"competence_date" date NOT NULL,
	"status" "billing_run_status" NOT NULL,
	"created_by_user_id" text NOT NULL,
	"eligible_count" integer DEFAULT 0 NOT NULL,
	"generated_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "accounts_receivable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"contract_id" uuid,
	"billing_run_id" uuid,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"competence_date" date NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"status" "account_receivable_status" DEFAULT 'pending' NOT NULL,
	"payment_date" date,
	"payment_method" "payment_method",
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_run_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billing_run_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"status" "billing_run_item_status" NOT NULL,
	"skip_reason" text,
	"error_message" text,
	"account_receivable_id" uuid,
	"amount" numeric(12, 2),
	"due_date" date
);
--> statement-breakpoint
ALTER TABLE "billing_runs" ADD CONSTRAINT "billing_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_runs" ADD CONSTRAINT "billing_runs_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_billing_run_id_billing_runs_id_fk" FOREIGN KEY ("billing_run_id") REFERENCES "public"."billing_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_run_items" ADD CONSTRAINT "billing_run_items_billing_run_id_billing_runs_id_fk" FOREIGN KEY ("billing_run_id") REFERENCES "public"."billing_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_run_items" ADD CONSTRAINT "billing_run_items_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_run_items" ADD CONSTRAINT "billing_run_items_account_receivable_id_accounts_receivable_id_fk" FOREIGN KEY ("account_receivable_id") REFERENCES "public"."accounts_receivable"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_runs_company_id_idx" ON "billing_runs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "billing_runs_company_competence_idx" ON "billing_runs" USING btree ("company_id","competence_date");--> statement-breakpoint
CREATE INDEX "accounts_receivable_company_id_idx" ON "accounts_receivable" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "accounts_receivable_client_id_idx" ON "accounts_receivable" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "accounts_receivable_contract_id_idx" ON "accounts_receivable" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "accounts_receivable_billing_run_id_idx" ON "accounts_receivable" USING btree ("billing_run_id");--> statement-breakpoint
CREATE INDEX "accounts_receivable_company_competence_idx" ON "accounts_receivable" USING btree ("company_id","competence_date");--> statement-breakpoint
CREATE INDEX "accounts_receivable_company_status_idx" ON "accounts_receivable" USING btree ("company_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_receivable_contract_competence_uidx" ON "accounts_receivable" USING btree ("contract_id","competence_date") WHERE "contract_id" IS NOT NULL AND "status" <> 'canceled';--> statement-breakpoint
CREATE INDEX "billing_run_items_billing_run_id_idx" ON "billing_run_items" USING btree ("billing_run_id");--> statement-breakpoint
CREATE INDEX "billing_run_items_contract_id_idx" ON "billing_run_items" USING btree ("contract_id");
