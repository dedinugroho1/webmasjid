CREATE TYPE "public"."kajian_frequency" AS ENUM('SETIAP_PEKAN', 'PEKAN_1_3', 'PEKAN_2_4', 'SEBULAN_SEKALI');--> statement-breakpoint
CREATE TABLE "jumat_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"date" date NOT NULL,
	"khatib" text,
	"imam" text,
	"muadzin" text,
	"theme" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_kajian" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"time" text NOT NULL,
	"title" text NOT NULL,
	"ustadz" text,
	"frequency" "kajian_frequency" DEFAULT 'SETIAP_PEKAN' NOT NULL,
	"audience" text,
	"location" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jumat_schedules" ADD CONSTRAINT "jumat_schedules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_kajian" ADD CONSTRAINT "routine_kajian_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "jumat_tenant_date_uidx" ON "jumat_schedules" USING btree ("tenant_id","date");--> statement-breakpoint
CREATE INDEX "routine_kajian_tenant_idx" ON "routine_kajian" USING btree ("tenant_id","day_of_week");