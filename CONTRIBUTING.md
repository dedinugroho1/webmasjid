# Panduan Kontribusi

Jazakumullahu khairan atas niat baik untuk berkontribusi di WebMasjid!

## Alur

1. Fork repositori, buat branch dari `main` (`feat/nama-fitur` atau `fix/deskripsi`).
2. Jalankan proyek secara lokal (lihat README).
3. Pastikan lolos: `npm run typecheck` dan `npm run build`.
4. Bila mengubah `src/db/schema.ts`, jalankan `npm run db:generate` dan sertakan file migrasi di `drizzle/`.
5. Buka Pull Request dengan deskripsi singkat & tangkapan layar untuk perubahan UI.

## Aturan penting

- **Multi-tenant:** setiap query data masjid wajib difilter `tenant_id` dari
  `requireTenantAccess()` — jangan pernah mempercayai `tenantId` dari input client.
- Teks antarmuka berbahasa Indonesia.
- Utamakan komponen ringan: halaman TV harus tetap lancar di Smart TV / STB murah.
- Jangan commit `.env` atau kredensial apa pun.

## Melaporkan bug / usulan fitur

Gunakan GitHub Issues. Untuk celah keamanan, mohon hubungi maintainer secara privat terlebih dahulu.
