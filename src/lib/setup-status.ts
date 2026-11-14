import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { missingEnv, type MissingEnv } from "./env";

export type SetupProblem =
  | { kind: "env"; missing: MissingEnv[] }
  | { kind: "not-migrated" }
  | { kind: "db-error"; message: string };

let readyAt = 0;
let lastCheck: { at: number; problem: SetupProblem | null } | null = null;

/**
 * Periksa apakah instance siap dipakai. Hasil "siap" di-cache selamanya per
 * instance; masalah dicek ulang tiap 15 detik (agar cepat pulih setelah redeploy).
 */
export async function getSetupProblem(): Promise<SetupProblem | null> {
  if (readyAt) return null;
  const missing = missingEnv();
  if (missing.length) return { kind: "env", missing };
  if (lastCheck && Date.now() - lastCheck.at < 15_000) return lastCheck.problem;

  let problem: SetupProblem | null = null;
  try {
    await db.execute(sql`select 1 from tenants limit 1`);
    readyAt = Date.now();
  } catch (e) {
    const err = e as { code?: string; cause?: { code?: string }; message?: string };
    const code = err.code ?? err.cause?.code;
    problem = code === "42P01" ? { kind: "not-migrated" } : { kind: "db-error", message: err.message ?? String(e) };
  }
  lastCheck = { at: Date.now(), problem };
  return problem;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Halaman HTML statis berisi petunjuk setup (tanpa React, aman saat DB belum siap). */
export function setupPageHtml(problem: SetupProblem) {
  let body: string;
  if (problem.kind === "env") {
    body = `<p>Variabel lingkungan berikut belum diisi:</p><ul>${problem.missing
      .map((m) => `<li><code>${esc(m.name)}</code><br><span>${esc(m.hint)}</span></li>`)
      .join("")}</ul><p>Setelah diisi, buka <b>Deployments → … → Redeploy</b> agar database dimigrasi.</p>`;
  } else if (problem.kind === "not-migrated") {
    body = `<p>Database sudah terhubung tetapi tabel belum dibuat.</p><p>Buka <b>Deployments → … → Redeploy</b> di Vercel — migrasi berjalan otomatis saat build.</p>`;
  } else {
    body = `<p>Tidak bisa terhubung ke database:</p><pre>${esc(problem.message).slice(0, 500)}</pre><p>Periksa <code>DATABASE_URL</code> di Vercel → Settings → Environment Variables, lalu Redeploy.</p>`;
  }
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Setup WebMasjid</title><meta name="robots" content="noindex">
<style>body{font-family:system-ui,sans-serif;background:#f6faf8;color:#12332a;margin:0;padding:24px}main{max-width:640px;margin:8vh auto;background:#fff;border:1px solid #d7e7df;border-radius:14px;padding:28px}h1{margin:0 0 4px;font-size:22px}small{color:#5b7a6f}li{margin:12px 0}li span{color:#3d5f54;font-size:14px}code{background:#e8f3ee;padding:2px 6px;border-radius:6px}pre{white-space:pre-wrap;background:#fbeaea;padding:12px;border-radius:8px;font-size:13px}a{color:#0f766e}</style></head>
<body><main><h1>🕌 WebMasjid — Setup belum selesai</h1><small>Halaman ini hanya muncul sampai konfigurasi lengkap.</small>${body}
<p><small>Panduan lengkap: <a href="https://github.com/dedinugroho1/webmasjid/blob/main/docs/DEPLOY-VERCEL.md">docs/DEPLOY-VERCEL.md</a></small></p></main></body></html>`;
}
