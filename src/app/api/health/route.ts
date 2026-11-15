import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — untuk uptime monitor (UptimeRobot, BetterStack, dll.).
 * 200 bila aplikasi & database responsif, 503 bila database bermasalah.
 * Tidak membocorkan detail error.
 */
export async function GET() {
  const started = Date.now();
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok", db: "ok", ms: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[health] database tidak responsif:", (e as Error).message);
    return Response.json({ status: "error", db: "down" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
