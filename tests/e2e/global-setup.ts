import { clearRateLimits } from "./db";

/**
 * Kosongkan penghitung rate limit sebelum tes, agar run berulang (lokal) tidak
 * terkunci oleh percobaan login dari run sebelumnya.
 */
export default async function globalSetup() {
  await clearRateLimits();
}
