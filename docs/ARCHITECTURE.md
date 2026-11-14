# Arsitektur WebMasjid

## Gambaran umum

```
                       ┌──────────────────────────── Next.js 16 (App Router) ────────────────────────────┐
 Browser / Smart TV ──▶│ proxy.ts ─▶ /                 Landing + direktori masjid                       │
                       │             /masuk, /daftar   Server Actions → Better Auth                      │
                       │             /api/auth/*       Better Auth handler                               │
                       │             /{slug}           Website publik masjid  (RSC, force-dynamic)       │
                       │             /{slug}/tv        TV Display (client, hitung jadwal lokal)          │
                       │             /{slug}/admin/*   Dashboard DKM ─▶ requireTenantAccess(slug, roles) │
                       └───────────────┬──────────────────────────────────────────────────────────────────┘
                                       │ Drizzle ORM (drizzle-orm/neon-serverless)
                                       ▼
                         Neon Postgres (pooled, WebSocket, transaksi)
```

## Multi-tenancy berbasis path

- Tenant = masjid, diidentifikasi oleh `tenants.slug` (unik) → `webmasjid.com/{slug}`.
- Route statis (`/masuk`, `/daftar`, `/api`) diprioritaskan Next.js di atas `[slug]`;
  `src/lib/reserved-slugs.ts` mencegah masjid mendaftar slug yang bentrok.
- Semua tabel data memiliki `tenant_id` + indeks komposit `(tenant_id, …)`.

## Autentikasi & otorisasi

| Lapisan | Mekanisme |
| --- | --- |
| Proxy (`src/proxy.ts`) | `getSessionCookie()` — redirect cepat ke `/masuk` bila tanpa cookie. Tidak memverifikasi sesi. |
| Server (`src/lib/session.ts`) | `requireTenantAccess(slug, roles?)` — `auth.api.getSession()` (verifikasi DB), lalu cek `session.tenantId ?? user.tenantId === tenant.id` atau `role === SUPERADMIN`. |
| Data | Query tulis/hapus selalu `WHERE tenant_id = <tenant terverifikasi>`. |

Better Auth:

- `user.additionalFields`: `tenantId`, `role` (`input: false` → tidak bisa diisi dari client).
- `session.additionalFields`: `tenantId`, diisi oleh `databaseHooks.session.create.before`
  dari `users.tenant_id`, sehingga setiap sesi terikat pada satu masjid.
- Pendaftaran masjid (`registerAction`): buat tenant → `auth.api.signUpEmail` → transaksi
  (set `users.tenant_id/role`, `sessions.tenant_id`, buat `prayer_settings`).

## Skema data

```
tenants ─┬─< users ──< sessions
         │          └─< accounts
         ├─< cash_transactions   (type IN/OUT, fund OPERASIONAL/PEMBANGUNAN, amount bigint Rupiah)
         ├─< events              (type KAJIAN/JUMAT/SOSIAL, speaker=khatib, imam)
         └── prayer_settings     (calculation_method, iqomah_offset_minutes) — 1:1
verifications (Better Auth)
```

Nominal disimpan sebagai `bigint` Rupiah utuh (tanpa desimal) untuk menghindari galat floating-point.
`transaction_date` bertipe `date` agar laporan bulanan tidak terpengaruh zona waktu.

## Jadwal sholat

- `src/lib/prayer.ts` memakai library `adhan` (pure JS) — dijalankan di **client**, sehingga
  TV Display tetap akurat tanpa koneksi internet setelah halaman termuat.
- Tanggal kalender diambil di zona waktu masjid (`tenants.timezone`: WIB/WITA/WIT), bukan zona server.
- Metode default **KEMENAG**: Subuh −20°, Isya −18°, ihtiyat ±2 menit, pembulatan ke atas.

## Fase layar TV

```
adzan masuk ──4 mnt──▶ ADZAN ──▶ IQOMAH (countdown hingga offset) ──12 mnt──▶ SHOLAT ──▶ NORMAL
Jumat (dzuhur):        ADZAN ──▶ KHUTBAH (45 + 12 mnt) ──▶ NORMAL
```

## Penyimpanan file

`src/lib/storage.ts`: Vercel Blob bila `BLOB_READ_WRITE_TOKEN` diset; jika tidak, gambar ≤ 300 KB
disimpan sebagai data URL di kolom teks (praktis untuk self-host tanpa object storage).

## Laporan PDF

`GET /{slug}/admin/kas/laporan?bulan=YYYY-MM` → `@react-pdf/renderer` (`renderToBuffer`, Node runtime):
ringkasan saldo awal/masuk/keluar/akhir per kas, rincian transaksi, dan kolom tanda tangan Ketua DKM & Bendahara.
