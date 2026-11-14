<div align="center">

# 🕌 WebMasjid

**Website masjid yang modern, transparan, dan siap pakai — gratis & open-source.**

Proyek amal jariyah digital: ribuan masjid bisa memiliki website sendiri di satu domain
(`webmasjid.com/nama-masjid`), atau meng-clone repositori ini untuk di-host mandiri.

[Demo](https://webmasjid.com/al-ikhlas) · [Daftarkan Masjid](https://webmasjid.com/daftar) · [Panduan Self-Host](docs/SELF-HOSTING.md) · [Arsitektur](docs/ARCHITECTURE.md)

</div>

---

## ✨ Fitur

| Modul | Keterangan |
| --- | --- |
| 📒 **Buku Kas Transparan** | Catat & edit pemasukan/pengeluaran untuk **kas operasional** & **kas pembangunan**, lampirkan bukti, tampil terbuka di website. Laporan bulanan **PDF 1-klik**. |
| 🕰️ **Jadwal Sholat Otomatis** | Dihitung dari koordinat masjid (kriteria Kemenag RI & metode lain), **koreksi menit & jeda iqomah per waktu**, hitung mundur adzan & iqomah. |
| 💳 **Infaq Digital** | QRIS masjid (perbesar/unduh) + daftar rekening resmi dengan tombol salin. |
| 📅 **Agenda & Kajian** | Jadwal kajian, petugas Jumat (khatib & imam), kegiatan sosial — bisa diedit. |
| 📣 **Pengumuman & Galeri** | Pengumuman (sematkan, batas tampil) dan galeri foto kegiatan dengan kompresi otomatis. |
| 👥 **Pengurus** | Undang bendahara/admin lewat link (WhatsApp), kelola peran, password sementara, lupa & ganti password. |
| 🌐 **Domain Sendiri** | Setiap masjid bisa memakai domain sendiri, mis. `masjidalikhlas.or.id`. |
| 🛡️ **Keamanan** | Isolasi multi-tenant, rate limit login/daftar/reset (berbasis DB), honeypot anti-bot, panel **superadmin** untuk menangguhkan pendaftaran palsu. |

## 🧱 Tech Stack

- **Next.js 16** (App Router, Server Actions, Proxy)
- **Neon Postgres** via `@neondatabase/serverless` (WebSocket Pool, mendukung transaksi)
- **Drizzle ORM** (`drizzle-orm/neon-serverless`) + drizzle-kit migrations
- **Better Auth** (email & password, Drizzle adapter, `tenantId` & `role` pada user/session)
- **Tailwind CSS v4** + **shadcn/ui** + **Lucide Icons**
- `adhan` (jadwal sholat), `@react-pdf/renderer` (laporan PDF), `zod` (validasi)

## 🗂️ Struktur Folder

```
webmasjid/
├── .github/workflows/ci.yml     # Typecheck, unit test, cek migrasi, E2E
├── drizzle/                     # File migrasi SQL (drizzle-kit generate)
├── docs/                        # ARCHITECTURE.md, SELF-HOSTING.md
├── scripts/
│   ├── seed.ts                  # Data demo Masjid Al-Ikhlas
│   └── make-superadmin.ts       # npm run superadmin -- <email>
├── tests/
│   ├── unit/                    # Vitest
│   └── e2e/                     # Playwright
└── src/
    ├── proxy.ts                 # Domain sendiri + cek cookie admin
    ├── app/
    │   ├── page.tsx             # Landing page webmasjid.com
    │   ├── (auth)/              # masuk, daftar, undangan, lupa/reset password
    │   ├── superadmin/          # Panel pengelola platform
    │   ├── api/auth/[...all]/   # Route handler Better Auth
    │   ├── api/platform-redirect/ # Redirect domain sendiri → domain utama
    │   └── [slug]/              # ── TENANT (masjid) ──
    │       ├── page.tsx         # Website publik masjid
    │       └── admin/           # Dashboard DKM (dilindungi)
    │           ├── kas/         # Buku kas, edit, laporan/route.ts (PDF)
    │           ├── agenda/      # Agenda & kajian
    │           ├── pengumuman/  # Pengumuman
    │           ├── galeri/      # Galeri kegiatan
    │           ├── pengurus/    # Undangan & kelola pengurus
    │           ├── akun/        # Ganti password
    │           └── pengaturan/  # Profil, lokasi & koreksi jadwal, QRIS, domain
    ├── components/              # ui/ (shadcn), landing/, masjid/, admin/, auth/
    ├── db/
    │   ├── index.ts             # Neon (default) atau node-postgres
    │   └── schema.ts            # Skema tabel
    └── lib/
        ├── auth.ts              # Better Auth (server)
        ├── session.ts           # requireTenantAccess / requireSuperadmin
        ├── rate-limit.ts        # Batas percobaan atomik berbasis DB
        ├── domains.ts           # Validasi & deteksi domain sendiri
        ├── prayer.ts            # Perhitungan jadwal sholat
        ├── finance.ts           # Saldo & laporan kas
        ├── storage.ts           # Upload gambar (Vercel Blob / data URL)
        └── pdf/cash-report.tsx  # Template PDF laporan kas
```

## 🚀 Mulai Cepat

```bash
git clone https://github.com/dedinugroho1/webmasjid.git
cd webmasjid
npm install
cp .env.example .env          # isi DATABASE_URL & BETTER_AUTH_SECRET
npm run db:migrate            # buat tabel
npm run db:seed               # (opsional) data demo /al-ikhlas
npm run dev
```

Buka <http://localhost:3000>. Akun demo: `admin@webmasjid.test` / `demo12345` → `/al-ikhlas/admin`.

Deploy otomatis dari GitHub ke Vercel (preview per branch): **[docs/DEPLOY-VERCEL.md](docs/DEPLOY-VERCEL.md)**.
Panduan self-host lain (VPS/Docker, domain sendiri): **[docs/SELF-HOSTING.md](docs/SELF-HOSTING.md)**.

### Skrip

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | Pemeriksaan TypeScript |
| `npm run db:generate` | Buat migrasi baru setelah mengubah `src/db/schema.ts` |
| `npm run db:migrate` | Terapkan migrasi ke database |
| `npm run db:push` | Sinkron skema langsung (prototyping) |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | Isi data demo |
| `npm test` | Unit test (Vitest) |
| `npm run test:e2e` | Tes end-to-end (Playwright, butuh Postgres) |
| `npm run superadmin -- <email>` | Jadikan akun sebagai superadmin platform |

## 🔐 Model Keamanan Multi-tenant

1. `proxy.ts` menolak cepat request `/{slug}/admin/*` & `/superadmin` tanpa cookie sesi.
2. Setiap page, server action, dan route handler admin memanggil `requireTenantAccess(slug, roles?)`
   yang memverifikasi sesi di database dan mencocokkan `session.tenantId` dengan masjid pada URL.
3. Semua query tulis memakai `tenant.id` hasil verifikasi — **tidak pernah** dari input form.
4. Role: `DKM_ADMIN` (semua modul), `BENDAHARA` (buku kas saja), `SUPERADMIN` (semua masjid & panel platform).
5. Rate limit login/daftar/reset password/undangan (per-IP & per-email) disimpan di database.

## 🗺️ Roadmap

- [x] Undang pengurus lain (bendahara) ke masjid yang sama
- [x] Panel superadmin platform
- [x] Custom domain per masjid
- [x] Koreksi menit & jeda iqomah per waktu sholat
- [x] Pengumuman & galeri kegiatan
- [ ] TV Display masjid (sementara dinonaktifkan; kolom `tenants.running_text` tetap disimpan)
- [ ] Ekspor buku kas ke Excel/CSV
- [ ] Notifikasi WhatsApp untuk pengumuman

## 🤝 Kontribusi

Kontribusi sangat diterima — lihat [CONTRIBUTING.md](CONTRIBUTING.md). Semoga menjadi amal jariyah bagi kita semua.

## 📄 Lisensi

[MIT](LICENSE)
