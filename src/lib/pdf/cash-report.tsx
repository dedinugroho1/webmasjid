/**
 * Template PDF laporan kas bulanan (A4) — siap cetak & tempel di papan
 * pengumuman masjid. Dirender di server via @react-pdf/renderer.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CashTransaction, Tenant } from "@/db/schema";
import { FUND_LABELS } from "@/lib/constants";
import { formatDate, formatRupiah, monthLabel } from "@/lib/format";
import type { getMonthlyReport } from "@/lib/finance";

type Report = Awaited<ReturnType<typeof getMonthlyReport>>;

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9.5, fontFamily: "Helvetica", color: "#1f2937" },
  header: { borderBottomWidth: 2, borderBottomColor: "#0f766e", paddingBottom: 8, marginBottom: 14, textAlign: "center" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#0f766e" },
  subtitle: { fontSize: 10, marginTop: 2 },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 6 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryBox: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 4, padding: 8 },
  summaryLine: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  bold: { fontFamily: "Helvetica-Bold" },
  table: { borderWidth: 1, borderColor: "#d1d5db" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  th: { backgroundColor: "#f0fdfa", fontFamily: "Helvetica-Bold" },
  cNo: { width: 22, padding: 4 },
  cDate: { width: 62, padding: 4 },
  cDesc: { flex: 1, padding: 4 },
  cFund: { width: 62, padding: 4 },
  cAmt: { width: 82, padding: 4, textAlign: "right" },
  in: { color: "#047857" },
  out: { color: "#b91c1c" },
  signRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 30 },
  signBox: { width: 180, textAlign: "center" },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, fontSize: 7.5, color: "#6b7280", textAlign: "center" },
});

export function CashReportPdf({ tenant, report, printedAt }: { tenant: Tenant; report: Report; printedAt: Date }) {
  const totalIn = report.funds.reduce((a, f) => a + f.income, 0);
  const totalOut = report.funds.reduce((a, f) => a + f.expense, 0);

  return (
    <Document title={`Laporan Kas ${tenant.name} - ${monthLabel(report.month)}`} author="WebMasjid">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>{tenant.name.toUpperCase()}</Text>
          {(tenant.address || tenant.city) && (
            <Text style={s.subtitle}>{[tenant.address, tenant.city].filter(Boolean).join(", ")}</Text>
          )}
          <Text style={[s.subtitle, s.bold]}>LAPORAN KEUANGAN BULAN {monthLabel(report.month).toUpperCase()}</Text>
        </View>

        <Text style={s.h2}>Ringkasan Saldo</Text>
        <View style={s.summaryRow}>
          {report.funds.map((f) => (
            <View key={f.fund} style={s.summaryBox}>
              <Text style={s.bold}>{FUND_LABELS[f.fund]}</Text>
              <Line label="Saldo awal bulan" value={formatRupiah(f.opening)} />
              <Line label="Pemasukan" value={`+ ${formatRupiah(f.income)}`} style={s.in} />
              <Line label="Pengeluaran" value={`- ${formatRupiah(f.expense)}`} style={s.out} />
              <Line label="Saldo akhir bulan" value={formatRupiah(f.closing)} bold />
            </View>
          ))}
        </View>

        <Text style={s.h2}>Rincian Transaksi</Text>
        <View style={s.table}>
          <View style={[s.tr, s.th]} fixed>
            <Text style={s.cNo}>No</Text>
            <Text style={s.cDate}>Tanggal</Text>
            <Text style={s.cDesc}>Uraian</Text>
            <Text style={s.cFund}>Kas</Text>
            <Text style={s.cAmt}>Masuk</Text>
            <Text style={s.cAmt}>Keluar</Text>
          </View>
          {report.transactions.length === 0 && (
            <View style={s.tr}>
              <Text style={[s.cDesc, { textAlign: "center" }]}>Tidak ada transaksi pada bulan ini.</Text>
            </View>
          )}
          {report.transactions.map((t: CashTransaction, i: number) => (
            <View key={t.id} style={s.tr} wrap={false}>
              <Text style={s.cNo}>{i + 1}</Text>
              <Text style={s.cDate}>{formatDate(t.transactionDate, "UTC", { month: "short" })}</Text>
              <Text style={s.cDesc}>
                {t.category}
                {t.description ? ` — ${t.description}` : ""}
              </Text>
              <Text style={s.cFund}>{t.fund === "OPERASIONAL" ? "Operasional" : "Pembangunan"}</Text>
              <Text style={[s.cAmt, s.in]}>{t.type === "IN" ? formatRupiah(t.amount) : ""}</Text>
              <Text style={[s.cAmt, s.out]}>{t.type === "OUT" ? formatRupiah(t.amount) : ""}</Text>
            </View>
          ))}
          <View style={[s.tr, s.th]}>
            <Text style={[s.cDesc, { textAlign: "right" }]}>TOTAL</Text>
            <Text style={[s.cAmt, s.in]}>{formatRupiah(totalIn)}</Text>
            <Text style={[s.cAmt, s.out]}>{formatRupiah(totalOut)}</Text>
          </View>
        </View>

        <View style={s.signRow} wrap={false}>
          <View style={s.signBox}>
            <Text>Mengetahui,</Text>
            <Text>Ketua DKM</Text>
            <Text style={{ marginTop: 48 }}>(..............................)</Text>
          </View>
          <View style={s.signBox}>
            <Text>{tenant.city ?? ""}, {formatDate(printedAt, tenant.timezone)}</Text>
            <Text>Bendahara</Text>
            <Text style={{ marginTop: 48 }}>(..............................)</Text>
          </View>
        </View>

        <Text
          style={s.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Dicetak dari WebMasjid · ${formatDate(printedAt, tenant.timezone)} · Halaman ${pageNumber}/${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

function Line({ label, value, style, bold }: { label: string; value: string; style?: (typeof s)["in"]; bold?: boolean }) {
  return (
    <View style={s.summaryLine}>
      <Text style={bold ? s.bold : undefined}>{label}</Text>
      <Text style={[bold ? s.bold : {}, style ?? {}]}>{value}</Text>
    </View>
  );
}
