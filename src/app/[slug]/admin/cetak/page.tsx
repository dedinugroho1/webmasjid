import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { jumatSchedules, routineKajian } from "@/db/schema";
import { DatePickerNav } from "@/components/admin/date-picker-nav";
import { PrintButton } from "@/components/admin/print-button";
import { FUND_LABELS } from "@/lib/constants";
import { getBalances, monthRange } from "@/lib/finance";
import { currentMonth, formatDate, formatRupiah, formatTime, monthLabel, todayISO } from "@/lib/format";
import { addDays, DAY_NAMES, FREQUENCY_LABELS, fridaysInMonth } from "@/lib/jumat";
import { getPrayerSchedule } from "@/lib/prayer";
import { requireTenantAccess } from "@/lib/session";
import { getPrayerConfig } from "@/lib/tenant";

const SECTIONS = { jumat: "Petugas Jumat", kajian: "Kajian Rutin", sholat: "Jadwal Sholat", kas: "Ringkasan Kas" } as const;
type Section = keyof typeof SECTIONS;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ bulan?: string; isi?: string | string[] }> };

/** Halaman A4 siap cetak untuk papan pengumuman masjid. */
export default async function CetakPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN", "BENDAHARA"]);
  const month = sp.bulan && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.bulan) ? sp.bulan : currentMonth(tenant.timezone);
  const requested = (Array.isArray(sp.isi) ? sp.isi : sp.isi ? [sp.isi] : []).filter((s): s is Section => s in SECTIONS);
  const show = new Set<Section>(requested.length ? requested : (Object.keys(SECTIONS) as Section[]));

  const fridays = fridaysInMonth(month);
  const [jumat, kajian, balances, prayerConfig] = await Promise.all([
    db
      .select()
      .from(jumatSchedules)
      .where(and(eq(jumatSchedules.tenantId, tenant.id), inArray(jumatSchedules.date, fridays))),
    db
      .select()
      .from(routineKajian)
      .where(and(eq(routineKajian.tenantId, tenant.id), eq(routineKajian.isActive, true)))
      .orderBy(asc(routineKajian.dayOfWeek)),
    getBalances(tenant.id),
    getPrayerConfig(tenant),
  ]);
  const jumatByDate = new Map(jumat.map((j) => [j.date, j]));

  // Jadwal sholat harian satu bulan.
  const { start, end } = monthRange(month);
  const days: string[] = [];
  for (let d = start; d < end; d = addDays(d, 1)) days.push(d);
  const prayerRows = days.map((d) => {
    const noon = new Date(`${d}T05:00:00Z`); // ±12.00 WIB–14.00 WIT: pasti tanggal yang sama
    return { date: d, times: getPrayerSchedule(prayerConfig, noon) };
  });

  return (
    <div className="mx-auto max-w-[210mm] bg-white text-black">
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3 print:hidden">
        <DatePickerNav type="month" value={month} param="bulan" basePath={`/${slug}/admin/cetak`} label="Bulan" />
        <form method="GET" className="flex flex-wrap items-center gap-3 text-sm">
          <input type="hidden" name="bulan" value={month} />
          {(Object.entries(SECTIONS) as [Section, string][]).map(([key, label]) => (
            <label key={key} className="flex items-center gap-1.5">
              <input type="checkbox" name="isi" value={key} defaultChecked={show.has(key)} /> {label}
            </label>
          ))}
          <button type="submit" className="underline">
            Terapkan
          </button>
        </form>
        <div className="ml-auto">
          <PrintButton />
        </div>
      </div>

      <article className="grid gap-6 p-2 text-[13px] leading-snug print:p-0">
        <header className="border-b-2 border-black pb-2 text-center">
          <h1 className="text-xl font-bold uppercase">{tenant.name}</h1>
          {(tenant.address || tenant.city) && <p>{[tenant.address, tenant.city].filter(Boolean).join(", ")}</p>}
          <p className="font-semibold">Papan Informasi — {monthLabel(month)}</p>
        </header>

        {show.has("jumat") && (
          <section>
            <h2 className="mb-1 font-bold uppercase">Petugas Sholat Jumat</h2>
            <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:bg-gray-100 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Khatib</th>
                  <th>Imam</th>
                  <th>Muadzin</th>
                </tr>
              </thead>
              <tbody>
                {fridays.map((d) => {
                  const j = jumatByDate.get(d);
                  return (
                    <tr key={d}>
                      <td className="whitespace-nowrap">{formatDate(d)}</td>
                      <td>{j?.khatib ?? ""}</td>
                      <td>{j?.imam ?? ""}</td>
                      <td>{j?.muadzin ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {show.has("kajian") && (
          <section>
            <h2 className="mb-1 font-bold uppercase">Jadwal Kajian Rutin</h2>
            {kajian.length === 0 ? (
              <p className="italic">Belum ada kajian rutin.</p>
            ) : (
              <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:bg-gray-100 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left">
                <thead>
                  <tr>
                    <th>Hari & Waktu</th>
                    <th>Kajian</th>
                    <th>Pengisi</th>
                    <th>Jadwal</th>
                  </tr>
                </thead>
                <tbody>
                  {kajian.map((k) => (
                    <tr key={k.id}>
                      <td className="whitespace-nowrap">
                        {DAY_NAMES[k.dayOfWeek]}, {k.time}
                      </td>
                      <td>
                        {k.title}
                        {k.audience ? ` (${k.audience})` : ""}
                      </td>
                      <td>{k.ustadz ?? ""}</td>
                      <td>{FREQUENCY_LABELS[k.frequency]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {show.has("kas") && (
          <section>
            <h2 className="mb-1 font-bold uppercase">Saldo Kas per {formatDate(todayISO(tenant.timezone))}</h2>
            <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1">
              <tbody>
                {(["OPERASIONAL", "PEMBANGUNAN"] as const).map((f) => (
                  <tr key={f}>
                    <td>{FUND_LABELS[f]}</td>
                    <td className="text-right font-semibold">{formatRupiah(balances[f].balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {show.has("sholat") && (
          <section className="break-before-page">
            <h2 className="mb-1 font-bold uppercase">Jadwal Sholat {monthLabel(month)}</h2>
            <table className="w-full border-collapse text-center text-[11px] [&_td]:border [&_td]:border-black [&_td]:px-1 [&_td]:py-0.5 [&_th]:border [&_th]:border-black [&_th]:bg-gray-100 [&_th]:px-1 [&_th]:py-0.5">
              <thead>
                <tr>
                  <th>Tgl</th>
                  {prayerRows[0]?.times.map((t) => (
                    <th key={t.key}>{t.key === "dzuhur" ? "Dzuhur" : t.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prayerRows.map((r) => (
                  <tr key={r.date} className={new Date(`${r.date}T00:00:00Z`).getUTCDay() === 5 ? "bg-gray-100 font-semibold" : ""}>
                    <td>{Number(r.date.slice(8))}</td>
                    {r.times.map((t) => (
                      <td key={t.key}>{formatTime(t.time, tenant.timezone)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-[10px]">Baris tebal = hari Jumat. Dihitung untuk koordinat masjid.</p>
          </section>
        )}
      </article>
    </div>
  );
}
