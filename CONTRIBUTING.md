# Panduan Kontribusi

Jazakumullahu khairan atas niat baik untuk berkontribusi di WebMasjid!

## Alur

1. Fork repositori, buat branch dari `main` (`feat/nama-fitur` atau `fix/deskripsi`).
2. Jalankan proyek secara lokal (lihat README).
3. Pastikan lolos: `npm run typecheck`, `npm test` (unit), dan `npm run build`.
   Untuk tes end-to-end butuh Postgres lokal (lihat di bawah): `npm run test:e2e`.
4. Bila mengubah `src/db/schema.ts`, jalankan `npm run db:generate` dan sertakan file migrasi di `drizzle/`.
5. Buka Pull Request dengan deskripsi singkat & tangkapan layar untuk perubahan UI.

## Menjalankan tes end-to-end secara lokal

```bash
docker run -d --name webmasjid-test -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=webmasjid -p 5432:5432 postgres:16
# .env: DATABASE_URL="postgresql://postgres:postgres@localhost:5432/webmasjid"  DATABASE_DRIVER="pg"
npm run db:migrate && npm run db:seed && npm run build
npx playwright install chromium
npm run test:e2e
```

CI (GitHub Actions) menjalankan typecheck, unit test, pengecekan migrasi, dan tes end-to-end
pada setiap Pull Request.

## Aturan penting

- **Multi-tenant:** setiap query data masjid wajib difilter `tenant_id` dari
  `requireTenantAccess()` — jangan pernah mempercayai `tenantId` dari input client.
- Teks antarmuka berbahasa Indonesia.
- Utamakan komponen ringan: halaman TV harus tetap lancar di Smart TV / STB murah.
- Jangan commit `.env` atau kredensial apa pun.

## Melaporkan bug / usulan fitur

Gunakan GitHub Issues. Untuk celah keamanan, mohon hubungi maintainer secara privat terlebih dahulu.
