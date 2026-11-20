CREATE TABLE "platform_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"actor_id" text,
	"actor_name" text NOT NULL,
	"actor_email" text,
	"target_type" text NOT NULL,
	"target_id" text,
	"target_label" text,
	"summary" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "platform_audit_created_idx" ON "platform_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "platform_audit_target_idx" ON "platform_audit_logs" USING btree ("target_type","target_id");