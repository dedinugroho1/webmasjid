import "./scripts/load-env";
import { defineConfig } from "drizzle-kit";
import { databaseUrlUnpooled } from "./src/lib/env";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Untuk migrasi gunakan koneksi langsung (non-pooled) bila tersedia.
    url: databaseUrlUnpooled() ?? "",
  },
  strict: true,
  verbose: true,
});
