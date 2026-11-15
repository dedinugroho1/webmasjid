# Checklist Launch WebMasjid

Centang satu per satu sebelum mengumumkan WebMasjid ke masjid-masjid.

## Wajib

- [ ] **Variabel lingkungan produksi** terisi di Vercel (Production): `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
      `BETTER_AUTH_SECRET`, dan keempat `BUNNY_*` (lihat [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md)).
- [ ] **Kontak & operator:** isi `NEXT_PUBLIC_OPERATOR_NAME` dan `NEXT_PUBLIC_CONTACT_EMAIL`
      agar Kebijakan Privasi/Syarat memuat pengelola dan kontak yang benar (tanpa ini halaman memakai
      tautan GitHub Issues).
- [ ] **Tinjau Kebijakan Privasi & Syarat** di `/privasi` dan `/syarat`. Keduanya templat standar yang
      mengikuti cara kerja aplikasi, **bukan nasihat hukum**; konsultasikan dengan penasihat hukum bila
      layanan dipakai secara komersial atau oleh banyak lembaga.
- [ ] **Akun superadmin Anda:** daftar di `/daftar`, lalu `npm run superadmin -- email-anda@domain.com`.
- [ ] **Ganti password akun demo** (`admin@webmasjid.test`) atau set `SEED_DEMO=false`. Masjid demo bersifat
      hanya-baca, tetapi password-nya sebaiknya tidak dibiarkan default.
- [ ] **Cabut semua kredensial yang pernah dibagikan lewat chat:** token Vercel, API key Neon, API key akun Bunny.
- [ ] **Paket Vercel:** paket Hobby (gratis) hanya untuk penggunaan non-komersial. Bila ada layanan berbayar
      (mis. jasa pasang), gunakan paket Pro.
- [ ] **Backup:** lakukan `pg_dump` pertama dan uji restore ([BACKUP.md](BACKUP.md)).
- [ ] **Uji dari iPhone/Safari** dan satu HP Android murah: daftar, catat infaq, buka website masjid.

## Sangat disarankan

- [ ] **Domain `webmasjid.com`:** hubungkan di Vercel → Domains, lalu isi `NEXT_PUBLIC_APP_URL`,
      `BETTER_AUTH_URL`, dan `PLATFORM_HOSTS` ([SELF-HOSTING.md](SELF-HOSTING.md)).
- [ ] **Email lupa password:** `RESEND_API_KEY` dan `EMAIL_FROM`.
- [ ] **Cache Pull Zone Bunny:** turunkan *Cache Expiration Time* (mis. 1 jam) agar foto yang dihapus cepat tidak
      terbuka lagi lewat alamat langsungnya ([DEPLOY-VERCEL.md](DEPLOY-VERCEL.md)).
- [ ] **Uptime monitor** (mis. UptimeRobot/BetterStack, gratis) ke `https://domain-anda/api/health`
      (200 = sehat, 503 = database bermasalah).
- [ ] **Pantau kuota gratis:** Neon (jam komputasi/penyimpanan), Vercel, dan Bunny. Kuota Neon yang habis
      membuat situs berhenti sampai periode berikutnya.
- [ ] **Donasi & layanan:** isi `NEXT_PUBLIC_PLATFORM_QRIS_URL` dan `NEXT_PUBLIC_SERVICE_WHATSAPP`
      agar bagian donasi dan "Terima Beres" tampil di landing page (disembunyikan bila kosong).

## Setelah launch

- [ ] Jalankan tes langsung ke production: `PROD_URL=https://domain-anda npm run test:prod`
      (butuh `.env.local` berisi koneksi database untuk membersihkan data uji).
- [ ] Cek panel `/superadmin` berkala untuk pendaftaran mencurigakan; tangguhkan bila perlu.
- [ ] Bila spam pendaftaran muncul: tambahkan moderasi masjid baru atau CAPTCHA (Cloudflare Turnstile).
