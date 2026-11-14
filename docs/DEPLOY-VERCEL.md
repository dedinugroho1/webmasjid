# Deploy ke Vercel (Auto Deploy dari GitHub)

Setelah tersambung, **setiap push ke GitHub otomatis ter-deploy**:
- push ke `main` → **Production** (mis. `webmasjid.vercel.app`)
- push ke branch lain / Pull Request → **Preview** dengan subdomain sendiri
  (mis. `webmasjid-git-nama-branch-akun.vercel.app`), cocok untuk testing.

Migrasi database dijalankan otomatis di setiap build (`npm run vercel-build`).

## 1. Import repositori

1. Masuk ke <https://vercel.com> dengan akun GitHub.
2. **Add New… → Project → Import Git Repository**, pilih `webmasjid`.
   Bila tidak muncul: **Adjust GitHub App Permissions** dan izinkan repo ini.
3. Framework terdeteksi **Next.js** — biarkan pengaturan build bawaan
   (Vercel otomatis memakai skrip `vercel-build`).
4. **Jangan klik Deploy dulu** — tambahkan database & variabel di langkah 2–3.
   (Bila terlanjur, deploy pertama gagal karena belum ada database; tidak apa-apa.)

## 2. Database Neon (gratis)

Di proyek Vercel: **Storage → Create Database → Neon (Serverless Postgres)** → pilih region
**Singapore** → **Connect** ke proyek ini untuk environment Production & Preview.
Vercel otomatis mengisi `DATABASE_URL` dan `DATABASE_URL_UNPOOLED`.

> Alternatif: buat project di <https://neon.tech> lalu isi kedua variabel itu manual.

## 3. Environment Variables

**Settings → Environment Variables** (centang Production & Preview):

| Nama | Nilai |
| --- | --- |
| `BETTER_AUTH_SECRET` | string acak ≥ 32 karakter (`openssl rand -base64 32`) — **wajib** |
| `SEED_DEMO` | `true` bila ingin masjid demo `/al-ikhlas` untuk testing |
| `NEXT_PUBLIC_GITHUB_URL` | URL repo GitHub Anda (opsional) |
| `NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_URL` | **kosongkan** saat memakai subdomain Vercel — terdeteksi otomatis. Isi `https://domain-anda` setelah memasang domain sendiri. |
| `PLATFORM_HOSTS` | domain milik platform bila memakai domain sendiri, mis. `webmasjid.com,www.webmasjid.com` |
| `RESEND_API_KEY`, `EMAIL_FROM` | opsional, untuk email lupa password |
| `BLOB_READ_WRITE_TOKEN` | opsional — otomatis terisi bila menambahkan **Storage → Blob** (foto > 300 KB) |

## 4. Deploy & uji

1. **Deployments → Redeploy** (atau push commit apa saja).
2. Buka URL deployment:
   - `/` landing page, `/al-ikhlas` masjid demo (bila `SEED_DEMO=true`)
   - Login demo: `admin@webmasjid.test` / `demo12345` → **segera ganti password** di menu *Akun Saya*,
     atau set `SEED_DEMO=false` setelah selesai uji coba.
   - `/daftar` untuk mendaftarkan masjid sungguhan.
3. Jadikan akun Anda superadmin (dari komputer, dengan `DATABASE_URL` produksi di `.env`):

   ```bash
   npm run superadmin -- email-anda@domain.com
   ```

## Troubleshooting

Bila konfigurasi belum lengkap, build **tetap berhasil** dan situs menampilkan halaman
**"Setup belum selesai"** yang menyebutkan apa yang kurang. Lengkapi lalu **Redeploy**.

| Gejala | Penyebab & solusi |
| --- | --- |
| `404 DEPLOYMENT_NOT_FOUND` | Belum ada deployment yang berhasil (mis. deploy pertama saat import gagal). Buka **Deployments**, pilih deploy terbaru → **Redeploy**. |
| Halaman "Setup belum selesai" — `DATABASE_URL` | Pasang Neon di **Storage** dan *Connect* ke proyek (Production & Preview), lalu Redeploy. Nama `POSTGRES_URL` juga diterima. |
| Halaman "Setup belum selesai" — `BETTER_AUTH_SECRET` | Tambahkan di **Settings → Environment Variables** (min. 32 karakter), lalu Redeploy. |
| "Tabel belum dibuat" | Env baru diisi setelah build terakhir — Redeploy agar migrasi berjalan. |
| Log build: `Tidak bisa terhubung ke database` | `DATABASE_URL` salah/kedaluwarsa — salin ulang dari dashboard Neon. |
| Foto gagal diunggah | Lebih dari 300 KB tanpa Vercel Blob — tambahkan Storage → Blob. |
