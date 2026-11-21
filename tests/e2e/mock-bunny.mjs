/**
 * Server Bunny Storage tiruan untuk tes E2E (tanpa kredensial/jaringan).
 *
 *   PUT    /{zone}/{path}   simpan file (header AccessKey wajib cocok)
 *   DELETE /{zone}/{path}   hapus file (path berakhiran "/" = hapus folder rekursif)
 *   GET    /cdn/{path}      "Pull Zone": sajikan file
 *   GET    /__files         daftar path yang tersimpan (untuk asersi tes)
 *
 * Sekaligus Mailketing tiruan (API v2):
 *   POST   /mailketing/api/v2/send   terima email (header Authorization: Bearer wajib cocok)
 *   GET    /__emails                 daftar email yang diterima (untuk asersi tes)
 */
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_BUNNY_PORT ?? 4010);
const ZONE = process.env.BUNNY_STORAGE_ZONE ?? "webmasjid-test";
const KEY = process.env.BUNNY_STORAGE_PASSWORD ?? "kunci-tes";
const TYPES = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif" };
const MAIL_TOKEN = process.env.MAILKETING_API_TOKEN ?? "token-tes";
const files = new Map();
const emails = [];

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = decodeURIComponent(url.pathname);

  if (req.method === "GET" && path === "/__files") return json(res, 200, [...files.keys()].sort());
  if (req.method === "GET" && path === "/__emails") return json(res, 200, emails);

  if (req.method === "POST" && path === "/mailketing/api/v2/send") {
    if (req.headers.authorization !== `Bearer ${MAIL_TOKEN}`) {
      return json(res, 401, { success: false, data: null, message: "Invalid API token" });
    }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return json(res, 422, { success: false, data: null, message: "Validation failed" });
    }
    const missing = ["from_name", "from_email", "recipient", "subject", "content"].filter((k) => !body[k]);
    if (missing.length) {
      return json(res, 422, { success: false, data: null, message: "Validation failed", errors: Object.fromEntries(missing.map((k) => [k, `${k} is required`])) });
    }
    emails.push({ ...body, receivedAt: new Date().toISOString() });
    return json(res, 200, { success: true, data: { message_id: `<api.${emails.length}@mock>` }, message: "Email queued successfully" });
  }

  if (req.method === "GET" && path.startsWith("/cdn/")) {
    const key = path.slice("/cdn/".length);
    const file = files.get(key);
    if (!file) return json(res, 404, { HttpCode: 404, Message: "Not found" });
    res.writeHead(200, { "Content-Type": TYPES[key.split(".").pop()] ?? "application/octet-stream" });
    return res.end(file);
  }

  const prefix = `/${ZONE}/`;
  if (path.startsWith(prefix) && (req.method === "PUT" || req.method === "DELETE")) {
    if (req.headers.accesskey !== KEY) return json(res, 401, { HttpCode: 401, Message: "Unauthorized" });
    const key = path.slice(prefix.length);
    if (key.includes("..")) return json(res, 400, { HttpCode: 400, Message: "Bad path" });
    if (req.method === "PUT") {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      files.set(key, Buffer.concat(chunks));
      return json(res, 201, { HttpCode: 201, Message: "File uploaded." });
    }
    if (key.endsWith("/")) {
      // Seperti Bunny sungguhan: DELETE pada path berakhiran "/" menghapus folder beserta isinya.
      const doomed = [...files.keys()].filter((k) => k.startsWith(key));
      doomed.forEach((k) => files.delete(k));
      return doomed.length
        ? json(res, 200, { HttpCode: 200, Message: "Directory deleted successfully." })
        : json(res, 404, { HttpCode: 404, Message: "Object Not Found" });
    }
    if (!files.delete(key)) return json(res, 404, { HttpCode: 404, Message: "Object Not Found" });
    return json(res, 200, { HttpCode: 200, Message: "File deleted successfully." });
  }

  json(res, 404, { HttpCode: 404, Message: "Not found" });
}).listen(PORT, () => console.log(`[mock-bunny] http://localhost:${PORT} (zone ${ZONE})`));
