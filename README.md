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
| 📒 **Buku Kas Transparan** | Catat pemasukan/pengeluaran untuk **kas operasional** & **kas pembangunan**, lampirkan bukti, tampil terbuka di website. Laporan bulanan **PDF 1-klik** siap tempel di papan pengumuman. |
| 🕰️ **Jadwal Sholat Otomatis** | Dihitung dari koordinat masjid (kriteria Kemenag RI & metode lain), hitung mundur adzan & iqomah. Tanpa API eksternal. |
| 💳 **Infaq Digital** | QRIS masjid (perbesar/unduh) + daftar rekening resmi dengan tombol salin. |
| 📅 **Agenda & Kajian** | Jadwal kajian, petugas Jumat (khatib & imam), kegiatan sosial. |
| 🏢 **Multi-tenant** | Satu instance melayani banyak masjid. Setiap sesi admin terikat ke masjidnya (`sessions.tenant_id`). |

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
├── drizzle/                     # File migrasi SQL (drizzle-kit generate)
├── docs/                        # ARCHITECTURE.md, SELF-HOSTING.md
├── scripts/seed.ts              # Data demo Masjid Al-Ikhlas
└── src/
    ├── proxy.ts                 # Cek cookie sesi untuk /{slug}/admin/*
    ├── app/
    │   ├── page.tsx             # Landing page webmasjid.com
    │   ├── (auth)/              # /masuk & /daftar + server actions
    │   ├── api/auth/[...all]/   # Route handler Better Auth
    │   └── [slug]/              # ── TENANT (masjid) ──
    │       ├── page.tsx         # Website publik masjid
    │       └── admin/           # Dashboard DKM (dilindungi)
    │           ├── page.tsx     # Ringkasan
    │           ├── kas/         # Buku kas + laporan/route.ts (PDF)
    │           ├── agenda/      # Agenda & kajian
    │           └── pengaturan/  # Profil, lokasi, QRIS, rekening
    ├── components/
    │   ├── ui/                  # shadcn/ui
    │   ├── landing/ masjid/ admin/ auth/
    ├── db/
    │   ├── index.ts             # Koneksi Neon + Drizzle
    │   └── schema.ts            # Skema tabel
    ├── hooks/
    └── lib/
        ├── auth.ts              # Konfigurasi Better Auth (server)
        ├── auth-client.ts       # Client Better Auth (React)
        ├── session.ts           # requireTenantAccess() — guard multi-tenant
        ├── tenant.ts            # Query tenant, jadwal, agenda
        ├── finance.ts           # Saldo & laporan kas
        ├── prayer.ts            # Perhitungan jadwal sholat
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

Panduan deploy lengkap (Vercel + Neon, domain sendiri): **[docs/SELF-HOSTING.md](docs/SELF-HOSTING.md)**.

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

## 🔐 Model Keamanan Multi-tenant

1. `proxy.ts` menolak cepat request `/{slug}/admin/*` tanpa cookie sesi.
2. Setiap page, server action, dan route handler admin memanggil `requireTenantAccess(slug, roles?)`
   yang memverifikasi sesi di database dan mencocokkan `session.tenantId` dengan masjid pada URL.
3. Semua query tulis memakai `tenant.id` hasil verifikasi — **tidak pernah** dari input form.
4. Role: `DKM_ADMIN` (semua modul), `BENDAHARA` (buku kas saja), `SUPERADMIN` (semua masjid).

## 🗺️ Roadmap

- [ ] Undang pengurus lain (bendahara) ke masjid yang sama
- [ ] Panel superadmin platform
- [ ] Custom domain per masjid (`masjidku.or.id` → tenant)
- [ ] Penyesuaian menit per waktu sholat (koreksi jadwal lokal)
- [ ] Galeri kegiatan & pengumuman
- [ ] TV Display masjid (sementara dinonaktifkan; kolom `tenants.running_text` tetap disimpan)

## 🤝 Kontribusi

Kontribusi sangat diterima — lihat [CONTRIBUTING.md](CONTRIBUTING.md). Semoga menjadi amal jariyah bagi kita semua.

## 📄 Lisensi

[MIT](LICENSE)
