import { toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/format";
import { checkSuperadmin } from "@/lib/session";
import { exportTenantsForAdmin, parseTenantFilter, parseTenantSort } from "@/lib/superadmin-queries";
import { appUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /superadmin/ekspor?q=&status=&urut= → CSV masjid + kontak admin (untuk menghubungi pengurus). */
export async function GET(request: Request) {
  if (!(await checkSuperadmin())) return new Response("Tidak diizinkan", { status: 403 });
  const sp = new URL(request.url).searchParams;
  const rows = await exportTenantsForAdmin({
    q: sp.get("q") ?? "",
    filter: parseTenantFilter(sp.get("status") ?? undefined),
    sort: parseTenantSort(sp.get("urut") ?? undefined),
  });

  const status = (r: (typeof rows)[number]) => (r.suspendedAt ? "Ditangguhkan" : !r.approvedAt && !r.isDemo ? "Menunggu persetujuan" : r.isPublished ? "Publik" : "Tersembunyi");
  const csv = toCsv([
    ["Nama", "Alamat (slug)", "Kota", "Status", "Terdaftar", "Nama admin", "Email admin", "Jumlah pengurus", "Jumlah transaksi", "URL"],
    ...rows.map((r) => [r.name, r.slug, r.city ?? "", status(r), formatDate(r.createdAt), r.adminName ?? "", r.adminEmail ?? "", r.members, r.transactions, `${appUrl()}/${r.slug}`]),
  ]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="masjid-webmasjid.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
