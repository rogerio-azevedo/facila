ALTER TABLE "issuer_service_profiles" ADD COLUMN "issqn_cst" text DEFAULT '000' NOT NULL;--> statement-breakpoint
ALTER TABLE "issuer_service_profiles" ADD COLUMN "municipal_tax_code" text;--> statement-breakpoint
ALTER TABLE "issuer_service_profiles" ADD COLUMN "nbs_code" text;--> statement-breakpoint
ALTER TABLE "issuer_service_profiles" ADD COLUMN "p_tot_trib_sn" numeric(6, 4);--> statement-breakpoint
ALTER TABLE "issuer_service_profiles" ADD COLUMN "c_class_trib" text;--> statement-breakpoint
ALTER TABLE "issuer_service_profiles" ADD COLUMN "c_ind_op" text;--> statement-breakpoint
ALTER TABLE "issuer_service_profiles" ADD COLUMN "ind_dest" text;--> statement-breakpoint
ALTER TABLE "issuer_service_profiles" ADD COLUMN "fin_nfse" text;--> statement-breakpoint
ALTER TABLE "issuer_service_profiles" ADD COLUMN "ind_final" text;
