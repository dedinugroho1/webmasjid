# Arsitektur WebMasjid

## Gambaran umum

```
                       ┌──────────────────────────── Next.js 16 (App Router) ────────────────────────────┐
 Browser ────────────▶│ proxy.ts ─▶ /                 Landing + direktori masjid                       │
                       │             /masuk, /daftar   Server Actions → Better Auth                      │
                       │             /api/auth/*       Better Auth handler                               │
                       │             /{slug}           Website publik masjid  (RSC, force-dynamic)       │
                       │             /{slug}/admin/*   Dashboard DKM ─▶ requireTenantAccess(slug, roles) │
                       │             /superadmin       Panel platform ─▶ requireSuperadmin()             │
                       │  domain sendiri ─▶ rewrite /{slug}; login/admin ─▶ domain utama                │
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

## Pengurus & undangan

- Admin DKM membuat link `/undangan/{token}` (token acak, disimpan sebagai hash SHA-256, sekali pakai,
  berlaku 7 hari). Klaim undangan dilakukan dengan satu `UPDATE … WHERE accepted_at IS NULL` sehingga
  tidak bisa dipakai dua kali secara bersamaan.
- Tanpa email (Resend), admin dapat membuat password sementara; semua sesi pengurus tersebut dicabut.

## Rate limit

`src/lib/rate-limit.ts` → `consume(key, {window, max})` berupa satu upsert atomik di tabel `rate_limits`.
Dipakai sebagai `customStorage` Better Auth (request langsung ke `/api/auth/*`) dan lewat `checkLimits()`
di server action (login per-IP & per-email, daftar, reset password, terima undangan).

## Domain sendiri

`tenants.custom_domain` diperiksa di `proxy.ts` untuk host yang bukan milik platform (`PLATFORM_HOSTS`,
host `NEXT_PUBLIC_APP_URL`, `*.vercel.app`). Lookup di-cache 60 detik per instance.
Redirect ke domain utama dilakukan lewat route handler `/api/platform-redirect`, karena Next.js
menormalkan header `Location` dari proxy menjadi relatif (host dibandingkan memakai header `Host`),
yang menyebabkan loop di domain sendiri.

## Skema data

```
tenants ─┬─< users ──< sessions
         │          └─< accounts
         ├─< cash_transactions   (type IN/OUT, fund OPERASIONAL/PEMBANGUNAN, amount bigint Rupiah)
         ├─< events              (type KAJIAN/JUMAT/SOSIAL, speaker=khatib, imam)
         ├─< announcements       (is_pinned, expires_at)
         ├─< audit_logs          (entity, action, actor_name, summary, before/after jsonb)
         ├─< gallery_items
         ├─< invitations         (token_hash, role, expires_at, accepted_at)
         └── prayer_settings     (calculation_method, adjustments, iqomah_minutes) — 1:1
verifications (Better Auth) · rate_limits · platform_settings (registration_open, moderation_enabled)
```

`tenants.approved_at` = `NULL` berarti masjid menunggu persetujuan (moderasi aktif): tidak masuk direktori/sitemap dan
halamannya `noindex`, tetapi dashboard tetap bisa dipakai. Migrasi memberi nilai `created_at` pada masjid yang sudah ada.
`tenants.suspended_at` menandai masjid yang ditangguhkan superadmin (halaman publik 404, pengurus tidak bisa masuk).
Nominal disimpan sebagai `bigint` Rupiah utuh (tanpa desimal) untuk menghindari galat floating-point.
`transaction_date` bertipe `date` agar laporan bulanan tidak terpengaruh zona waktu.

## Jadwal sholat

- `src/lib/prayer.ts` memakai library `adhan` (pure JS) — dijalankan di **client** untuk hitung mundur real-time.
- Tanggal kalender diambil di zona waktu masjid (`tenants.timezone`: WIB/WITA/WIT), bukan zona server.
- Metode default **KEMENAG**: Subuh −20°, Isya −18°, ihtiyat ±2 menit, pembulatan ke atas.
- `prayer_settings.adjustments` menggeser tiap waktu ±30 menit; `iqomah_minutes` mengatur jeda iqomah per waktu.

## Penyimpanan file

`src/lib/storage.ts`: Bunny Storage bila `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_PASSWORD` dan `BUNNY_CDN_URL`
diset — gambar diunggah lewat HTTP `PUT` ke API storage (`{region}.storage.bunnycdn.com`), nama file acak
(`{tenantId}/{jenis}/{uuid}.{ext}`), URL publik lewat Pull Zone. File lama dihapus (`deleteImage`) setelah
database berhasil diperbarui, dan hanya untuk URL milik CDN kita. Tanpa Bunny, gambar ≤ 300 KB disimpan
sebagai data URL di kolom teks (praktis untuk self-host tanpa object storage). Tes E2E memakai server
Bunny tiruan (`tests/e2e/mock-bunny.mjs`).

## Laporan PDF

`GET /{slug}/admin/kas/laporan?bulan=YYYY-MM` → `@react-pdf/renderer` (`renderToBuffer`, Node runtime):
ringkasan saldo awal/masuk/keluar/akhir per kas, rincian transaksi, dan kolom tanda tangan Ketua DKM & Bendahara.

## Riwayat perubahan (audit log)

`src/lib/audit.ts` (logika murni: potret transaksi, perbandingan sebelum/sesudah, ringkasan berbahasa Indonesia) dan
`src/lib/audit-log.ts` (tulis/baca). Setiap tambah, ubah, dan hapus transaksi kas, serta undangan, perubahan peran,
mengeluarkan pengurus dari masjid, dan reset password, ditulis ke tabel `audit_logs` **di dalam transaksi database yang sama** dengan
perubahannya, sehingga tidak pernah ada perubahan tanpa jejak. Nama pelaku disalin (snapshot) agar tetap terbaca bila akunnya
dihapus. Aplikasi hanya menyediakan penulisan dan pembacaan; tidak ada fitur mengubah atau menghapus riwayat. Riwayat ikut
terhapus (cascade) saat masjid dihapus.

## Panel superadmin

`/superadmin` (Masjid) dan `/superadmin/pengguna` dilindungi `requireSuperadmin()`. Pengaturan global (pendaftaran dibuka,
moderasi) disimpan di `platform_settings` dan menimpa default dari environment tanpa deploy ulang. Query daftar memakai
subquery berkorelasi per halaman (20 baris); kolom `tenants.id` ditulis eksplisit karena Drizzle membuang awalan tabel pada
query satu-tabel.
