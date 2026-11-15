# Backup & Pemulihan Data

Data keuangan masjid tidak boleh hilang. Ada tiga hal yang perlu dicadangkan:

| Data | Disimpan di | Cara mencadangkan |
| --- | --- | --- |
| Database (kas, agenda, akun, pengaturan) | Neon Postgres | `pg_dump` berkala (di bawah) + fitur restore Neon |
| Foto (logo, QRIS, galeri, bukti) | Bunny Storage | Aktifkan replikasi/backup di Bunny, atau salin berkala |
| Laporan kas | — | Pengurus mengunduh **PDF bulanan** dan **Excel** dari menu Buku Kas |

## 1. Backup database dengan pg_dump

Dari komputer yang memiliki `psql`/`pg_dump` (PostgreSQL client 16+). Pakai connection string
**direct** (`DATABASE_URL_UNPOOLED`, tanpa `-pooler`):

```bash
pg_dump "$DATABASE_URL_UNPOOLED" --format=custom --no-owner --file="webmasjid-$(date +%F).dump"
```

Simpan file `.dump` di tempat **privat** (komputer sendiri, Google Drive pribadi, dsb.).
**Jangan** mengunggahnya ke GitHub, termasuk sebagai artifact GitHub Actions di repo publik: berisi
data keuangan dan email pengurus.

Pulihkan ke database kosong:

```bash
pg_restore --no-owner --dbname="$DATABASE_URL_UNPOOLED" webmasjid-2026-11-15.dump
```

Saran jadwal: mingguan, dan sebelum setiap migrasi/perubahan skema.

## 2. Restore bawaan Neon

Neon menyimpan riwayat perubahan sehingga database dapat dikembalikan ke titik waktu tertentu
(**Branches → Restore**) atau dibuatkan branch dari titik waktu itu. Lama riwayat bergantung pada
paket Neon: pada paket gratis jendelanya pendek, sehingga **jangan hanya mengandalkan ini**.
Lihat <https://neon.com/docs/introduction/branch-restore>.

## 3. Foto di Bunny

Bunny Storage menyediakan replikasi ke region lain (Storage Zone → **Replication**). Replikasi
melindungi dari kegagalan server, bukan dari penghapusan yang tidak sengaja. Foto penting (QRIS,
bukti transaksi) juga sebaiknya disimpan pengurus di tempat lain. Folder di zone diberi nama sesuai
`tenant_id` masjid.

## 4. Menghapus data (hak pengguna)

Admin DKM dapat menghapus masjid beserta seluruh data dan foto lewat **Pengaturan → Hapus Masjid**.
Penghapusan permanen dan **tidak ikut dipulihkan** dari backup lama kecuali Anda me-restore dump tersebut,
jadi bila sebuah masjid meminta datanya dihapus, hapus juga dump lama yang masih memuatnya.

## 5. Latihan pemulihan

Backup yang belum pernah diuji belum bisa dianggap ada. Minimal sekali, restore dump ke database Neon
sementara (buat branch/project baru), jalankan `npm run dev` dengan `DATABASE_URL` itu, dan pastikan
login serta Buku Kas tampil benar.
