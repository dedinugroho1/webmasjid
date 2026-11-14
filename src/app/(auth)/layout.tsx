import Link from "next/link";
import { Landmark } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-pattern flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-bold">
        <Landmark className="text-primary size-6" /> WebMasjid
      </Link>
      {children}
    </div>
  );
}
