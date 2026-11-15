import type { Metadata } from "next";
import { Clause, LegalPage } from "@/components/legal/legal-page";
import { platformConfig } from "@/lib/platform";
import { githubUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Data apa yang dikumpulkan WebMasjid, untuk apa dipakai, dan bagaimana pengurus masjid dapat menghapusnya.",
};

export default function PrivasiPage() {
  const { operatorName, contactEmail } = platformConfig();
  const contact = contactEmail ? (
    <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
  ) : (
    <a href={`${githubUrl()}/issues`} target="_blank" rel="noreferrer">
      halaman Issues di GitHub
    </a>
  );

  return (
    <LegalPage title="Kebijakan Privasi" updated="15 November 2026">
      <p>
        WebMasjid membantu pengurus masjid (DKM) memiliki website sederhana: buku kas, petugas Jumat, kajian rutin, dan
        jadwal sholat. Halaman ini menjelaskan data apa yang kami simpan dan bagaimana kami menjaganya. Layanan ini
        dikelola oleh <b>{operatorName}</b> (&ldquo;kami&rdquo;).
      </p>

      <Clause n={1} title="Data yang kami simpan">
        <ul>
          <li>
            <b>Akun pengurus:</b> nama, alamat email, dan kata sandi. Kata sandi disimpan dalam bentuk <i>hash</i> sehingga
            tidak bisa dibaca siapa pun, termasuk kami.
          </li>
          <li>
            <b>Profil masjid:</b> nama, alamat, kota, koordinat lokasi, telepon dan email DKM, logo, foto sampul, QRIS, dan
            nomor rekening resmi masjid.
          </li>
          <li>
            <b>Catatan pengurus:</b> transaksi buku kas (termasuk bukti/nota bila diunggah), petugas Jumat, kajian rutin,
            agenda, pengumuman, dan foto galeri.
          </li>
          <li>
            <b>Data teknis:</b> alamat IP dan jenis perangkat/browser saat masuk (untuk keamanan sesi), serta penghitung
            percobaan masuk/daftar per alamat IP dan email (untuk mencegah penyalahgunaan).
          </li>
          <li>
            <b>Cookie:</b> hanya satu cookie sesi agar pengurus tetap masuk. Kami tidak memakai cookie pelacak, iklan, atau
            analitik pihak ketiga.
          </li>
        </ul>
        <p>Pengunjung website masjid tidak perlu membuat akun, dan kami tidak menyimpan data pribadi pengunjung.</p>
      </Clause>

      <Clause n={2} title="Apa yang tampil untuk publik">
        <p>
          Halaman publik masjid (<code>/nama-masjid</code>) sengaja terbuka untuk jamaah. Isinya mencakup profil dan kontak
          DKM, jadwal sholat, saldo dan riwayat transaksi kas, petugas Jumat, kajian, agenda, pengumuman, galeri foto, QRIS,
          dan rekening. Karena itu <b>jangan memasukkan data pribadi yang tidak ingin dipublikasikan</b> (misalnya nama
          donatur tanpa izin, nomor telepon pribadi, atau foto jamaah tanpa persetujuan). Pengurus bertanggung jawab atas
          isi yang dimasukkan.
        </p>
        <p>
          Halaman admin, email akun, dan alamat IP <b>tidak</b> ditampilkan ke publik.
        </p>
      </Clause>

      <Clause n={3} title="Tujuan penggunaan data">
        <ul>
          <li>Menjalankan layanan: login, pengelolaan data masjid, dan menampilkan website masjid.</li>
          <li>Menjaga keamanan: membatasi percobaan masuk berulang, mencegah pendaftaran palsu/spam.</li>
          <li>Mengirim email penting, misalnya tautan atur ulang kata sandi (bila fitur email diaktifkan).</li>
        </ul>
        <p>Kami tidak menjual data dan tidak memakainya untuk iklan.</p>
      </Clause>

      <Clause n={4} title="Pihak ketiga yang membantu menjalankan layanan">
        <ul>
          <li>
            <b>Vercel</b> — hosting aplikasi (dapat mencatat log permintaan seperti alamat IP).
          </li>
          <li>
            <b>Neon</b> — database PostgreSQL (server di Singapura).
          </li>
          <li>
            <b>Bunny.net</b> — penyimpanan dan pengiriman foto (logo, QRIS, galeri, bukti transaksi).
          </li>
          <li>
            <b>Resend</b> — pengiriman email, hanya bila diaktifkan.
          </li>
        </ul>
        <p>
          Karena itu data dapat diproses di server luar Indonesia. Bila Anda memasang WebMasjid sendiri (<i>self-host</i>),
          pihak yang mengelola instance tersebut bertanggung jawab atas datanya.
        </p>
      </Clause>

      <Clause n={5} title="Keamanan">
        <p>
          Kata sandi di-<i>hash</i>, koneksi memakai HTTPS, percobaan masuk dibatasi, dan data setiap masjid dipisahkan
          sehingga pengurus satu masjid tidak dapat membuka data masjid lain. Tidak ada sistem yang sepenuhnya kebal;
          segera hubungi kami bila menemukan celah atau penyalahgunaan.
        </p>
      </Clause>

      <Clause n={6} title="Penyimpanan dan penghapusan data">
        <p>
          Data disimpan selama masjid aktif. Sesi login berakhir otomatis setelah 30 hari. Admin DKM dapat{" "}
          <b>menghapus masjid beserta seluruh datanya</b> kapan saja lewat menu <b>Pengaturan → Hapus Masjid</b>; akun
          pengurus, catatan kas, agenda, pengumuman, dan foto di penyimpanan ikut terhapus permanen dan tidak dapat
          dipulihkan. Sebelum menghapus, unduh dulu laporan kas (PDF/Excel) bila masih dibutuhkan.
        </p>
      </Clause>

      <Clause n={7} title="Hak Anda">
        <p>
          Anda berhak mengakses, memperbaiki, dan menghapus data pribadi Anda, serta menarik persetujuan. Sebagian besar
          dapat dilakukan sendiri lewat dashboard. Untuk hal lain, atau bila akun Anda tidak dapat diakses, hubungi kami di{" "}
          {contact}.
        </p>
      </Clause>

      <Clause n={8} title="Perubahan kebijakan">
        <p>
          Kebijakan ini dapat diperbarui. Tanggal berlaku di bagian atas halaman menunjukkan versi terbaru. Perubahan
          penting akan diumumkan di website ini.
        </p>
      </Clause>

      <Clause n={9} title="Kontak">
        <p>
          Pertanyaan tentang privasi: {contact}. Kode sumber WebMasjid terbuka di{" "}
          <a href={githubUrl()} target="_blank" rel="noreferrer">
            GitHub
          </a>{" "}
          sehingga cara kerja pengelolaan data dapat diperiksa siapa saja.
        </p>
      </Clause>
    </LegalPage>
  );
}
