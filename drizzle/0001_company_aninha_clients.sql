ALTER TYPE "public"."client_role" RENAME TO "company_role";--> statement-breakpoint
ALTER TABLE "clients" RENAME TO "companies";--> statement-breakpoint
ALTER TABLE "client_members" RENAME TO "company_members";--> statement-breakpoint
ALTER TABLE "company_members" RENAME COLUMN "client_id" TO "company_id";--> statement-breakpoint
ALTER TABLE "company_members" DROP CONSTRAINT "client_members_client_id_clients_id_fk";--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER INDEX "client_members_client_user_idx" RENAME TO "company_members_company_user_idx";--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_company_id_idx" ON "clients" USING btree ("company_id");
