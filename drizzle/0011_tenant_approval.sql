ALTER TABLE "tenants" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
-- Masjid yang sudah ada sebelum fitur moderasi dianggap sudah disetujui.
UPDATE "tenants" SET "approved_at" = "created_at" WHERE "approved_at" IS NULL;
