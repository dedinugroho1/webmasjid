"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/superadmin", label: "Masjid" },
  { href: "/superadmin/pengguna", label: "Pengguna" },
];

export function SuperadminTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1" aria-label="Panel superadmin">
      {TABS.map((t) => {
        const active = t.href === "/superadmin" ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", active ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
