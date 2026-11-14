import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { getMonthlyReport } from "@/lib/finance";
import { currentMonth } from "@/lib/format";
import { CashReportPdf } from "@/lib/pdf/cash-report";
import { checkTenantAccess } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /{slug}/admin/kas/laporan?bulan=YYYY-MM → PDF laporan kas bulanan. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await checkTenantAccess(slug, ["DKM_ADMIN", "BENDAHARA"]);
  if (!access) return new Response("Tidak diizinkan", { status: 403 });

  const { tenant } = access;
  const bulan = new URL(request.url).searchParams.get("bulan");
  const month = bulan && /^\d{4}-(0[1-9]|1[0-2])$/.test(bulan) ? bulan : currentMonth(tenant.timezone);
  const report = await getMonthlyReport(tenant.id, month);

  const buffer = await renderToBuffer(
    createElement(CashReportPdf, { tenant, report, printedAt: new Date() }) as Parameters<typeof renderToBuffer>[0],
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="laporan-kas-${tenant.slug}-${month}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
