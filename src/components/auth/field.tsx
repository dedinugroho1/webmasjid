import { Label } from "@/components/ui/label";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string[];
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error?.length && <p className="text-muted-foreground text-xs">{hint}</p>}
      {error?.map((e) => (
        <p key={e} className="text-destructive text-xs">
          {e}
        </p>
      ))}
    </div>
  );
}
