import type { Metadata } from "next";
import Link from "next/link";
import { Clause, LegalPage } from "@/components/legal/legal-page";
import { platformConfig } from "@/lib/platform";
import { githubUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description: "Aturan pemakaian WebMasjid oleh pengurus masjid.",
};

export default function SyaratPage() {
  const { operatorName, contactEmail } = platformConfig();
  const contact = contactEmail ? (
    <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
  ) : (
    <a href={`${githubUrl()}/issues`} target="_blank" rel="noreferrer">
      halaman Issues di GitHub
    </a>
  );

  return (
    <LegalPage title="Syarat & Ketentuan" updated="15 November 2026">
      <p>
        Dengan mendaftarkan masjid atau memakai WebMasjid, Anda menyetujui syarat berikut. Layanan ini dikelola oleh{" "}
        <b>{operatorName}</b> sebagai amal jariyah digital dan tersedia gratis untuk masjid.
      </p>

      <Clause n={1} title="Tentang layanan">
        <p>
          WebMasjid adalah platform open-source untuk membuat website masjid: pencatatan kas dan infaq, petugas Jumat,
          kajian rutin, agenda, pengumuman, galeri, dan jadwal sholat. Layanan disediakan <i>&ldquo;apa adanya&rdquo;</i>{" "}
          tanpa jaminan tersedia terus-menerus atau bebas gangguan.
        </p>
      </Clause>

      <Clause n={2} title="Akun dan kewenangan">
        <ul>
          <li>Pendaftar menyatakan berwenang bertindak atas nama pengurus (DKM) masjid yang didaftarkan.</li>
          <li>Jaga kerahasiaan kata sandi. Aktivitas dari akun Anda menjadi tanggung jawab Anda.</li>
          <li>Berikan peran seperlunya: Bendahara hanya perlu akses Buku Kas.</li>
          <li>Dilarang mendaftarkan masjid fiktif atau mengatasnamakan masjid/lembaga lain.</li>
        </ul>
      </Clause>

      <Clause n={3} title="Isi yang Anda masukkan">
        <p>
          Pengurus bertanggung jawab atas keakuratan dan kepatutan seluruh isi (data kas, pengumuman, foto, kontak).
          Dilarang menyimpan atau menyebarkan konten yang melanggar hukum, mengandung SARA, ujaran kebencian, judi,
          pornografi, penipuan, atau spam, serta konten yang melanggar hak pihak lain. Isi website masjid bersifat publik
          (lihat <Link href="/privasi">Kebijakan Privasi</Link>).
        </p>
      </Clause>

      <Clause n={4} title="Buku kas dan jadwal sholat">
        <ul>
          <li>
            Fitur kas membantu transparansi, <b>bukan</b> pengganti pembukuan atau audit resmi. Pengurus tetap bertanggung
            jawab atas pembukuan masjid.
          </li>
          <li>
            Jadwal sholat dihitung otomatis dari koordinat masjid dan dapat berbeda dari jadwal resmi setempat. Pengurus
            wajib mencocokkannya dengan jadwal Kemenag/Bimas Islam dan memakai fitur koreksi bila perlu.
          </li>
        </ul>
      </Clause>

      <Clause n={5} title="Ketersediaan dan cadangan data">
        <p>
          Kami berupaya menjaga data, tetapi tidak menjamin tidak akan ada kehilangan data atau gangguan layanan. Unduh
          laporan kas (PDF/Excel) secara berkala sebagai arsip Anda sendiri.
        </p>
      </Clause>

      <Clause n={6} title="Penangguhan dan penghapusan">
        <p>
          Kami dapat menangguhkan atau menghapus masjid yang melanggar syarat ini, didaftarkan secara palsu, atau
          disalahgunakan, dengan atau tanpa pemberitahuan terlebih dahulu bila diperlukan untuk melindungi pengguna lain.
          Anda dapat menghapus masjid dan seluruh datanya sendiri kapan saja lewat <b>Pengaturan → Hapus Masjid</b>.
        </p>
      </Clause>

      <Clause n={7} title="Batas tanggung jawab">
        <p>
          Sejauh diizinkan hukum, kami tidak bertanggung jawab atas kerugian tidak langsung, kehilangan data, atau
          keputusan yang diambil berdasarkan informasi di website masjid. Tanggung jawab atas isi dan penggunaan ada pada
          pengurus masjid yang bersangkutan.
        </p>
      </Clause>

      <Clause n={8} title="Kode sumber dan hak atas data">
        <p>
          Kode WebMasjid berlisensi MIT dan terbuka di{" "}
          <a href={githubUrl()} target="_blank" rel="noreferrer">
            GitHub
          </a>
          . Data yang Anda masukkan tetap milik masjid Anda.
        </p>
      </Clause>

      <Clause n={9} title="Perubahan syarat dan hukum yang berlaku">
        <p>
          Syarat ini dapat diperbarui; versi terbaru berlaku sejak tanggal di bagian atas halaman. Syarat ini tunduk pada
          hukum Republik Indonesia.
        </p>
      </Clause>

      <Clause n={10} title="Kontak">
        <p>Pertanyaan atau laporan penyalahgunaan: {contact}.</p>
      </Clause>
    </LegalPage>
  );
}
