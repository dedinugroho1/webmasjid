import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** Token acak URL-safe (default 32 byte ≈ 43 karakter). */
export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/** Hash SHA-256 untuk menyimpan token di database (token mentah tidak pernah disimpan). */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Password sementara yang mudah dibacakan/diketik: mis. "kurma-7341-zaitun". */
export function generateTempPassword() {
  const words = ["kurma", "zaitun", "madu", "sajadah", "kubah", "mimbar", "menara", "wudhu", "tasbih", "qiblat"];
  const pick = () => words[randomBytes(1)[0] % words.length];
  const num = 1000 + (randomBytes(2).readUInt16BE(0) % 9000);
  return `${pick()}-${num}-${pick()}`;
}
