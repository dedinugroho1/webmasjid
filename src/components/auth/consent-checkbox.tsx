import Link from "next/link";

/** Persetujuan Syarat & Ketentuan dan Kebijakan Privasi (wajib saat membuat akun). */
export function ConsentCheckbox({ error }: { error?: string[] }) {
  return (
    <div className="grid gap-1">
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" required className="accent-primary mt-0.5 size-4 shrink-0" />
        <span>
          Saya telah membaca dan menyetujui{" "}
          <Link href="/syarat" target="_blank" className="text-primary underline">
            Syarat &amp; Ketentuan
          </Link>{" "}
          serta{" "}
          <Link href="/privasi" target="_blank" className="text-primary underline">
            Kebijakan Privasi
          </Link>
          .
        </span>
      </label>
      {error?.map((e) => (
        <p key={e} className="text-destructive text-xs">
          {e}
        </p>
      ))}
    </div>
  );
}
