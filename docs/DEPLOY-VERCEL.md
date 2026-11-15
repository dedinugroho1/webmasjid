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

> **Sudah punya project di console.neon.tech?** Jangan buat database baru di Vercel. Buka project
> Neon → **Connect** → pilih branch `production`, lalu salin ke Vercel → Settings → Environment Variables:
> - `DATABASE_URL` = connection string **pooled** (host berakhiran `-pooler`) — untuk aplikasi
> - `DATABASE_URL_UNPOOLED` = connection string **direct** (tanpa `-pooler`) — untuk migrasi
>
> Atau dari komputer: `neon env pull` menulis keduanya ke `.env.local`.

Driver bawaan adalah `node-postgres` (`pg`) dengan `attachDatabasePool` dari `@vercel/functions`,
sesuai rekomendasi Neon untuk Vercel Fluid compute. `DATABASE_DRIVER=neon` memakai
`@neondatabase/serverless` (WebSocket/443) untuk lingkungan yang memblokir port 5432.

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
| `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_PASSWORD`, `BUNNY_STORAGE_REGION`, `BUNNY_CDN_URL` | disarankan — penyimpanan foto di Bunny (lihat bagian *Penyimpanan foto*) |

## Penyimpanan foto (Bunny Storage)

Logo, QRIS, foto sampul, galeri, dan bukti transaksi disimpan di [Bunny Storage](https://bunny.net).
Tanpa konfigurasi ini foto tetap bisa diunggah, tetapi disimpan di database (maks 300 KB).

1. Di dashboard Bunny: **Storage → Add Storage Zone**. Beri nama (mis. `webmasjid`) dan pilih region
   utama; untuk pengguna di Indonesia, **Singapore** paling dekat.
2. Buka zone tersebut → **FTP & API Access** → salin **Password** (ini `BUNNY_STORAGE_PASSWORD`).
3. Di zone yang sama: **Connected Pull Zones → Connect Pull Zone** (buat baru bila belum ada).
   Salin hostname Pull Zone, mis. `webmasjid.b-cdn.net` (ini `BUNNY_CDN_URL`).
4. Isi variabel di Vercel, lalu Redeploy:

   | Variabel | Contoh |
   | --- | --- |
   | `BUNNY_STORAGE_ZONE` | `webmasjid` |
   | `BUNNY_STORAGE_PASSWORD` | password zone dari langkah 2 |
   | `BUNNY_STORAGE_REGION` | `sg` (kosongkan bila region utama/Falkenstein) |
   | `BUNNY_CDN_URL` | `https://webmasjid.b-cdn.net` |

Foto lama otomatis dihapus dari Bunny ketika diganti, dihapus, atau transaksinya dihapus.

> **Cache CDN:** setelah file dihapus dari Storage Zone, CDN masih dapat menyajikan salinan cache lewat alamat
> langsungnya sampai masa cache berakhir (foto tidak lagi tampil di website mana pun). Agar jeda ini singkat,
> buka **Pull Zone → Caching** dan turunkan *Cache Expiration Time* (mis. 1 jam). Nama file berupa UUID acak dan
> tidak pernah ditimpa, jadi cache yang singkat hanya menambah sedikit permintaan ke storage asal (trafik storage →
> CDN di Bunny tidak ditagih).

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
| Foto gagal diunggah: "maksimal 300 KB" | Variabel Bunny belum lengkap (keempatnya wajib, kecuali `BUNNY_STORAGE_REGION`). Isi lalu Redeploy. |
| Foto gagal diunggah: "menolak akses" | `BUNNY_STORAGE_PASSWORD` salah — pakai password **Storage Zone**, bukan API key akun Bunny. |
| Foto terunggah tapi tidak tampil | `BUNNY_CDN_URL` bukan Pull Zone milik zone tersebut, atau Pull Zone belum aktif. |
