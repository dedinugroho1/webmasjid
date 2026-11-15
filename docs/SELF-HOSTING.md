# Panduan Self-Host WebMasjid (Gratis)

Panduan ini untuk pengurus masjid yang ingin menjalankan WebMasjid di akun sendiri
(misalnya untuk satu masjid dengan domain `masjidku.or.id`). Semua layanan di bawah
memiliki paket gratis yang cukup untuk satu atau beberapa masjid.

## Yang dibutuhkan

- Akun GitHub, [Neon](https://neon.tech) (database), dan [Vercel](https://vercel.com) (hosting)
- Node.js ≥ 20.9 bila ingin menjalankan di komputer sendiri

## 1. Database Neon

1. Buat project baru di Neon, pilih region **Singapore (ap-southeast-1)** agar dekat dengan Indonesia.
2. Salin **connection string pooled** (host mengandung `-pooler`) → `DATABASE_URL`.
3. (Opsional) salin connection string **direct** → `DATABASE_URL_UNPOOLED` untuk migrasi.

## 2. Clone & konfigurasi

```bash
git clone https://github.com/dedinugroho1/webmasjid.git
cd webmasjid
npm install
cp .env.example .env
openssl rand -base64 32     # tempel hasilnya ke BETTER_AUTH_SECRET
```

Isi `.env`:

| Variabel | Contoh |
| --- | --- |
| `DATABASE_URL` | `postgresql://...-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` |
| `BETTER_AUTH_SECRET` | string acak ≥ 32 karakter |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` (lokal) atau `https://masjidku.or.id` |
| `NEXT_PUBLIC_ALLOW_REGISTRATION` | `false` setelah masjid Anda terdaftar (menutup pendaftaran) |
| `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_PASSWORD`, `BUNNY_STORAGE_REGION`, `BUNNY_CDN_URL` | opsional — penyimpanan gambar di Bunny (maks 4 MB); tanpa ini gambar ≤ 300 KB disimpan di database. Lihat [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md#penyimpanan-foto-bunny-storage) |

## 3. Buat tabel

```bash
npm run db:migrate
npm run db:seed      # opsional: data demo /al-ikhlas
```

## 4. Jalankan lokal

```bash
npm run dev
```

Buka `http://localhost:3000/daftar`, daftarkan masjid Anda, lalu kelola di `/{slug}/admin`.

## 5. Deploy ke Vercel

1. Push repositori (fork) Anda ke GitHub.
2. Di Vercel: **Add New → Project → Import** repositori tersebut.
3. Isi Environment Variables seperti `.env` (ganti URL dengan domain produksi).
4. Deploy. Migrasi cukup dijalankan dari komputer Anda (`npm run db:migrate`) dengan `DATABASE_URL` produksi.

### Domain sendiri

Di Vercel → Project → **Settings → Domains**, tambahkan `masjidku.or.id`, lalu atur DNS
sesuai instruksi. Perbarui `BETTER_AUTH_URL` & `NEXT_PUBLIC_APP_URL` ke domain tersebut.

### Domain sendiri per masjid

Setiap masjid bisa memakai domain sendiri (mis. `masjidalikhlas.or.id`) yang langsung menampilkan
website masjidnya, sementara login & dashboard tetap di domain utama:

1. Pengurus mengisi **Pengaturan → Domain Sendiri** dan membuat record DNS **CNAME** ke domain
   platform (atau nilai `NEXT_PUBLIC_CUSTOM_DOMAIN_TARGET`).
2. Pengelola platform menambahkan domain tersebut di hosting (Vercel → Settings → Domains).
3. Isi `PLATFORM_HOSTS` dengan semua host milik platform (mis. `webmasjid.com,www.webmasjid.com`)
   agar tidak dianggap domain masjid.

Untuk instance satu masjid, cukup isi domain utama sebagai `NEXT_PUBLIC_APP_URL` lalu atur domain
sendiri masjid seperti di atas — pengunjung `masjidku.or.id` langsung melihat website masjid.

## Alternatif: Postgres selain Neon

Set `DATABASE_DRIVER="pg"` untuk memakai Postgres biasa (VPS, Docker, Supabase, dll.) melalui
driver `node-postgres`. Contoh cepat dengan Docker:

```bash
docker run -d --name webmasjid-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=webmasjid -p 5432:5432 postgres:16
# .env → DATABASE_URL="postgresql://postgres:postgres@localhost:5432/webmasjid"  DATABASE_DRIVER="pg"
```

## Butuh bantuan?

Gunakan layanan **Jasa Pasang “Terima Beres”** di halaman utama webmasjid.com, atau buka Issue di GitHub.
