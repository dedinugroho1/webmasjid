"use client";

import { useActionState, useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { SettingsFormState } from "@/app/[slug]/admin/pengaturan/actions";
import type { Tenant } from "@/db/schema";
import { Field } from "@/components/auth/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CITIES } from "@/lib/cities";
import { TIMEZONES } from "@/lib/constants";
import { CALCULATION_METHODS, type PrayerKey } from "@/lib/prayer";
import { PrayerTuning } from "./prayer-tuning";

type Action = (prev: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;

export function SettingsForm({
  action,
  tenant,
  prayer,
}: {
  action: Action;
  tenant: Tenant;
  prayer: {
    calculationMethod: string;
    iqomahOffsetMinutes: number;
    adjustments: Partial<Record<PrayerKey, number>>;
    iqomahMinutes: Partial<Record<PrayerKey, number>>;
  };
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [loc, setLoc] = useState({
    city: tenant.city ?? "",
    latitude: String(tenant.latitude ?? ""),
    longitude: String(tenant.longitude ?? ""),
    timezone: tenant.timezone,
  });
  const [method, setMethod] = useState(prayer.calculationMethod);
  const host = (process.env.NEXT_PUBLIC_APP_URL ?? "webmasjid.com").replace(/^https?:\/\//, "");
  const cnameTarget = process.env.NEXT_PUBLIC_CUSTOM_DOMAIN_TARGET || host;
  const fe = state?.fieldErrors;

  return (
    <form action={formAction} className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profil Masjid</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama Masjid" htmlFor="name" error={fe?.name}>
            <Input id="name" name="name" defaultValue={tenant.name} required />
          </Field>
          <Field label="Alamat Website" htmlFor="slug" hint="Hubungi admin platform untuk mengubah alamat.">
            <Input id="slug" value={`/${tenant.slug}`} disabled />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Deskripsi Singkat" htmlFor="description" error={fe?.description}>
              <Textarea id="description" name="description" defaultValue={tenant.description ?? ""} rows={2} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Alamat" htmlFor="address" error={fe?.address}>
              <Input id="address" name="address" defaultValue={tenant.address ?? ""} />
            </Field>
          </div>
          <Field label="Telepon / WhatsApp DKM" htmlFor="phone" error={fe?.phone}>
            <Input id="phone" name="phone" defaultValue={tenant.phone ?? ""} />
          </Field>
          <Field label="Email DKM" htmlFor="email" error={fe?.email}>
            <Input id="email" name="email" type="email" defaultValue={tenant.email ?? ""} />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="isPublished" defaultChecked={tenant.isPublished} className="accent-primary size-4" />
            Tampilkan masjid di direktori publik WebMasjid
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Domain Sendiri (opsional)</CardTitle>
          <CardDescription>
            Pakai alamat sendiri, mis. <b>masjidalikhlas.or.id</b>. Website tetap juga bisa diakses di {host}/{tenant.slug}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Field label="Domain" htmlFor="customDomain" error={fe?.customDomain}>
            <Input id="customDomain" name="customDomain" placeholder="masjidalikhlas.or.id" defaultValue={tenant.customDomain ?? ""} />
          </Field>
          <ol className="text-muted-foreground list-decimal space-y-1 pl-5 text-xs">
            <li>
              Di pengelola DNS domain Anda, buat record <b>CNAME</b> yang mengarah ke <code className="text-foreground">{cnameTarget}</code>{" "}
              (untuk domain utama/apex, gunakan A record sesuai petunjuk hosting).
            </li>
            <li>Simpan domain di sini. Pengelola platform juga perlu menambahkan domain ini di hosting (mis. Vercel → Domains).</li>
            <li>Halaman login & dashboard tetap melalui {host}.</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lokasi & Jadwal Sholat</CardTitle>
          <CardDescription>Pilih kota terdekat, lalu sesuaikan koordinat persis masjid (dari Google Maps) bila perlu.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Preset Kota" htmlFor="cityPreset">
            <NativeSelect
              id="cityPreset"
              value={CITIES.some((c) => c.name === loc.city) ? loc.city : ""}
              onChange={(e) => {
                const c = CITIES.find((x) => x.name === e.target.value);
                if (c) setLoc({ city: c.name, latitude: String(c.latitude), longitude: String(c.longitude), timezone: c.timezone });
              }}
            >
              <option value="">— Pilih kota —</option>
              {CITIES.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Nama Kota" htmlFor="city" error={fe?.city}>
            <Input id="city" name="city" value={loc.city} onChange={(e) => setLoc({ ...loc, city: e.target.value })} />
          </Field>
          <Field label="Lintang (Latitude)" htmlFor="latitude" error={fe?.latitude}>
            <Input id="latitude" name="latitude" inputMode="decimal" value={loc.latitude} onChange={(e) => setLoc({ ...loc, latitude: e.target.value })} required />
          </Field>
          <Field label="Bujur (Longitude)" htmlFor="longitude" error={fe?.longitude}>
            <Input id="longitude" name="longitude" inputMode="decimal" value={loc.longitude} onChange={(e) => setLoc({ ...loc, longitude: e.target.value })} required />
          </Field>
          <Field label="Zona Waktu" htmlFor="timezone" error={fe?.timezone}>
            <NativeSelect id="timezone" name="timezone" value={loc.timezone} onChange={(e) => setLoc({ ...loc, timezone: e.target.value })}>
              {TIMEZONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Metode Perhitungan" htmlFor="calculationMethod" error={fe?.calculationMethod}>
            <NativeSelect id="calculationMethod" name="calculationMethod" value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(CALCULATION_METHODS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <PrayerTuning
            latitude={Number(loc.latitude)}
            longitude={Number(loc.longitude)}
            timezone={loc.timezone}
            method={method}
            initialAdjustments={prayer.adjustments}
            initialIqomah={prayer.iqomahMinutes}
            defaultIqomah={prayer.iqomahOffsetMinutes}
            errors={fe}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Infaq & Media</CardTitle>
          <CardDescription>Unggah gambar PNG/JPG/WEBP.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <ImageField name="logo" label="Logo Masjid" current={tenant.logoUrl} />
          <ImageField name="qris" label="QRIS Masjid" current={tenant.qrisUrl} />
          <ImageField name="cover" label="Foto Masjid (sampul)" current={tenant.coverUrl} />
          <div className="sm:col-span-3">
            <Field
              label="Rekening Resmi"
              htmlFor="bankAccounts"
              hint="Satu rekening per baris, format: Bank | Nomor Rekening | Atas Nama"
            >
              <Textarea
                id="bankAccounts"
                name="bankAccounts"
                rows={3}
                placeholder="BSI | 7123456789 | DKM Masjid Al-Ikhlas"
                defaultValue={tenant.bankAccounts.map((b) => `${b.bank} | ${b.number} | ${b.holder}`).join("\n")}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      {fe && <p className="text-destructive text-sm">Periksa kembali isian yang ditandai.</p>}
      {state?.ok && <p className="text-sm text-emerald-700">Pengaturan tersimpan.</p>}
      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Simpan Pengaturan
        </Button>
      </div>
    </form>
  );
}

function ImageField({ name, label, current }: { name: string; label: string; current: string | null }) {
  return (
    <div className="grid content-start gap-2">
      <Field label={label} htmlFor={name}>
        <Input id={name} name={name} type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
      </Field>
      {current && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current} alt="" className="size-16 rounded border bg-white object-contain" />
          <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <input type="checkbox" name={`remove_${name}`} className="accent-destructive" /> Hapus
          </label>
        </div>
      )}
    </div>
  );
}
