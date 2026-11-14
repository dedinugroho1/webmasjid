"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Paperclip, Plus, Save } from "lucide-react";
import type { KasFormState } from "@/app/[slug]/admin/kas/actions";
import type { CashFund, TransactionType } from "@/db/schema";
import { Field } from "@/components/auth/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { EXPENSE_CATEGORIES, FUND_LABELS, INCOME_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Action = (prev: KasFormState, formData: FormData) => Promise<KasFormState>;

export type TransactionInitial = {
  type: TransactionType;
  fund: CashFund;
  category: string;
  amount: number;
  description: string | null;
  transactionDate: string;
  receiptUrl: string | null;
};

export function TransactionForm({
  action,
  today,
  initial,
  cancelHref,
}: {
  action: Action;
  today: string;
  /** Diisi saat mode edit. */
  initial?: TransactionInitial;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [type, setType] = useState<TransactionType>(initial?.type ?? "IN");
  const [amount, setAmount] = useState(initial ? initial.amount.toLocaleString("id-ID") : "");
  const formRef = useRef<HTMLFormElement>(null);
  const baseCategories: readonly string[] = type === "IN" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  // Kategori lama yang tidak ada di daftar tetap bisa dipilih saat edit.
  const categories =
    initial && initial.type === type && !baseCategories.includes(initial.category)
      ? [initial.category, ...baseCategories]
      : baseCategories;

  useEffect(() => {
    if (state?.ok && !initial) {
      formRef.current?.reset();
      setAmount("");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-2 gap-2 rounded-lg border p-1">
        {(["IN", "OUT"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "rounded-md py-2 text-sm font-semibold transition",
              type === t ? (t === "IN" ? "bg-emerald-600 text-white" : "bg-red-600 text-white") : "hover:bg-accent",
            )}
          >
            {t === "IN" ? "Pemasukan" : "Pengeluaran"}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal" htmlFor="transactionDate" error={state?.fieldErrors?.transactionDate}>
          <Input id="transactionDate" name="transactionDate" type="date" defaultValue={initial?.transactionDate ?? today} required />
        </Field>
        <Field label="Jenis Kas" htmlFor="fund" error={state?.fieldErrors?.fund}>
          <NativeSelect id="fund" name="fund" defaultValue={initial?.fund ?? "OPERASIONAL"}>
            {Object.entries(FUND_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Kategori" htmlFor="category" error={state?.fieldErrors?.category}>
          <NativeSelect
            id="category"
            name="category"
            key={type}
            defaultValue={initial && initial.type === type ? initial.category : undefined}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Nominal (Rp)" htmlFor="amount" error={state?.fieldErrors?.amount}>
          <Input
            id="amount"
            name="amount"
            inputMode="numeric"
            placeholder="1.500.000"
            value={amount}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^\d]/g, "");
              setAmount(digits ? Number(digits).toLocaleString("id-ID") : "");
            }}
            required
          />
        </Field>
      </div>
      <Field label="Keterangan" htmlFor="description" error={state?.fieldErrors?.description}>
        <Input
          id="description"
          name="description"
          placeholder="mis. Infaq Jumat pekan ke-2"
          defaultValue={initial?.description ?? ""}
        />
      </Field>
      <Field label="Bukti / Nota (opsional)" htmlFor="receipt" error={state?.fieldErrors?.receipt}>
        <Input id="receipt" name="receipt" type="file" accept="image/*" />
      </Field>
      {initial?.receiptUrl && (
        <div className="flex items-center gap-4 text-sm">
          <a href={initial.receiptUrl} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline">
            <Paperclip className="size-3.5" /> Bukti saat ini
          </a>
          <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <input type="checkbox" name="remove_receipt" className="accent-destructive" /> Hapus bukti
          </label>
        </div>
      )}
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">Transaksi tersimpan.</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? <Loader2 className="animate-spin" /> : initial ? <Save /> : <Plus />}{" "}
          {initial ? "Simpan Perubahan" : "Simpan Transaksi"}
        </Button>
        {cancelHref && (
          <Button asChild variant="outline">
            <Link href={cancelHref}>Batal</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
