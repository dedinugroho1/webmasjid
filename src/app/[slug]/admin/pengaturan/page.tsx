import { SettingsForm } from "@/components/admin/settings-form";
import { requireTenantAccess } from "@/lib/session";
import { getPrayerSettings } from "@/lib/tenant";
import { updateSettings } from "./actions";

export default async function PengaturanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const prayer = await getPrayerSettings(tenant.id);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan Masjid</h1>
        <p className="text-muted-foreground text-sm">Profil, lokasi jadwal sholat, QRIS, dan rekening.</p>
      </div>
      <SettingsForm
        action={updateSettings.bind(null, slug)}
        tenant={tenant}
        prayer={{ calculationMethod: prayer.calculationMethod, iqomahOffsetMinutes: prayer.iqomahOffsetMinutes }}
      />
    </div>
  );
}
