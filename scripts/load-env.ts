/**
 * Muat variabel lingkungan untuk skrip CLI (migrasi, seed, build), dengan
 * urutan yang sama seperti Next.js: .env.local (mis. hasil `neon deploy` /
 * `neon env pull`) lebih diutamakan daripada .env. Variabel yang sudah ada
 * di environment (mis. di Vercel) tidak ditimpa.
 */
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
