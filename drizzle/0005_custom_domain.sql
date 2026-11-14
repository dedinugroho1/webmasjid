ALTER TABLE "tenants" ADD COLUMN "custom_domain" text;--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_custom_domain_uidx" ON "tenants" USING btree ("custom_domain");