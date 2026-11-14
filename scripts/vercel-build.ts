/**
 * Build untuk Vercel (npm run vercel-build):
 *   1. Cek variabel wajib — bila kurang, build TETAP lanjut agar situs
 *      menampilkan halaman "Setup belum selesai" (bukan 404).
 *   2. Migrasi database dengan pesan error yang jelas.
 *   3. Data demo opsional (SEED_DEMO=true, hanya bila belum ada).
 *   4. next build.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { databaseUrlUnpooled, missingEnv } from "../src/lib/env";

function banner(lines: string[]) {
  const bar = "═".repeat(72);
  console.log(`\n${bar}\n${lines.map((l) => `  ${l}`).join("\n")}\n${bar}\n`);
}

function run(cmd: string, args: string[]) {
  const res = spawnSync(cmd, args, { stdio: "inherit", env: process.env });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

async function migrateDb(url: string) {
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 15_000 });
  try {
    await client.connect();
  } catch (e) {
    banner([
      "❌ Tidak bisa terhubung ke database.",
      `   ${(e as Error).message}`,
      "   Periksa DATABASE_URL (dan DATABASE_URL_UNPOOLED) di Vercel → Settings → Environment Variables.",
    ]);
    process.exit(1);
  }
  try {
    console.log("🗄️  Menjalankan migrasi database…");
    await migrate(drizzle({ client }), { migrationsFolder: "./drizzle" });
    console.log("✅ Migrasi selesai.");
  } catch (e) {
    banner(["❌ Migrasi database gagal:", `   ${(e as Error).message}`]);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function main() {
  const missing = missingEnv();
  if (missing.length) {
    banner([
      "⚠️  Konfigurasi belum lengkap — build dilanjutkan, situs akan menampilkan",
      "    halaman petunjuk setup. Setelah melengkapi, klik Redeploy di Vercel.",
      "",
      ...missing.map((m) => `   • ${m.name}: ${m.hint}`),
    ]);
  }

  const url = databaseUrlUnpooled();
  if (url) {
    await migrateDb(url);
    run("npx", ["tsx", "scripts/deploy-setup.ts"]);
  } else {
    console.log("⏭️  Lewati migrasi & data demo (DATABASE_URL belum diisi).");
  }

  run("npx", ["next", "build"]);
}

main();
