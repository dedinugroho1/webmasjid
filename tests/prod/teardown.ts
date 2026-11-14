import { execSync } from "node:child_process";

/** Selalu bersihkan data uji, lulus atau gagal. */
export default function teardown() {
  execSync("npx tsx scripts/cleanup-test-data.ts", { stdio: "inherit", env: process.env });
}
