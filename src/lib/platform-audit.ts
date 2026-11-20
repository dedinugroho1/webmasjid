import "server-only";
import { and, desc, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { platformAuditLogs, type PlatformAuditAction } from "@/db/schema";
import { actionsInGroup, maskEmail, type PlatformActionGroup } from "./platform-audit-core";

/** `db` atau `tx` di dalam `db.transaction(...)`. */
type Executor = Pick<typeof db, "insert">;

export type PlatformAuditEntry = {
  action: PlatformAuditAction;
  actor: { id: string; name: string; email?: string | null };
  target: { type: "tenant" | "user" | "setting"; id?: string | null; label?: string | null };
  summary: string;
  details?: Record<string, unknown> | null;
};

/**
 * Catat satu tindakan pengelola platform. Panggil di dalam transaksi yang sama
 * dengan perubahannya bila memungkinkan. Email pelaku disimpan tersamar.
 */
export async function recordPlatformAudit(executor: Executor, e: PlatformAuditEntry) {
  await executor.insert(platformAuditLogs).values({
    action: e.action,
    actorId: e.actor.id,
    actorName: e.actor.name,
    actorEmail: maskEmail(e.actor.email),
    targetType: e.target.type,
    targetId: e.target.id ?? null,
    targetLabel: e.target.label ?? null,
    summary: e.summary.slice(0, 500),
    details: e.details ?? null,
  });
}

export const PLATFORM_AUDIT_PAGE_SIZE = 30;

export async function listPlatformAudit(opts: { group?: PlatformActionGroup | null; q?: string; page?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const conds: SQL[] = [];
  if (opts.group) conds.push(inArray(platformAuditLogs.action, actionsInGroup(opts.group)));
  const q = opts.q?.trim();
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    conds.push(
      or(
        ilike(platformAuditLogs.summary, like),
        ilike(platformAuditLogs.targetLabel, like),
        ilike(platformAuditLogs.actorName, like),
      )!,
    );
  }
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(platformAuditLogs)
      .where(where)
      .orderBy(desc(platformAuditLogs.createdAt), desc(platformAuditLogs.id))
      .limit(PLATFORM_AUDIT_PAGE_SIZE)
      .offset((page - 1) * PLATFORM_AUDIT_PAGE_SIZE),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(platformAuditLogs).where(where),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / PLATFORM_AUDIT_PAGE_SIZE)) };
}

