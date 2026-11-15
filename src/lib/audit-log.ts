import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, type AuditAction, type AuditEntity } from "@/db/schema";

/** `db` atau `tx` di dalam `db.transaction(...)` — yang penting punya `insert`. */
type Executor = Pick<typeof db, "insert">;

export type AuditEntry = {
  tenantId: string;
  entity: AuditEntity;
  entityId?: string | null;
  action: AuditAction;
  actor: { id: string; name: string };
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

/**
 * Catat satu entri riwayat. Panggil di dalam transaksi yang sama dengan
 * perubahannya agar tidak pernah ada perubahan tanpa jejak.
 */
export async function recordAudit(executor: Executor, e: AuditEntry) {
  await executor.insert(auditLogs).values({
    tenantId: e.tenantId,
    entity: e.entity,
    entityId: e.entityId ?? null,
    action: e.action,
    actorId: e.actor.id,
    actorName: e.actor.name,
    summary: e.summary,
    before: e.before ?? null,
    after: e.after ?? null,
  });
}

export const AUDIT_PAGE_SIZE = 30;

export async function listAudit(tenantId: string, opts: { entities: AuditEntity[]; page?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const where = and(eq(auditLogs.tenantId, tenantId), inArray(auditLogs.entity, opts.entities));
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(AUDIT_PAGE_SIZE)
      .offset((page - 1) * AUDIT_PAGE_SIZE),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(auditLogs).where(where),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)) };
}
