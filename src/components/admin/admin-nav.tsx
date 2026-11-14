"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookMarked,
  BookOpenText,
  CalendarDays,
  ExternalLink,
  Images,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Mic,
  Printer,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function AdminNav({ slug, canManage }: { slug: string; canManage: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/${slug}/admin`;
  const items = [
    { href: base, label: "Ringkasan", icon: LayoutDashboard },
    { href: `${base}/kas`, label: "Buku Kas", icon: BookOpenText },
    ...(canManage
      ? [
          { href: `${base}/jumat`, label: "Petugas Jumat", icon: Mic },
          { href: `${base}/kajian`, label: "Kajian Rutin", icon: BookMarked },
          { href: `${base}/agenda`, label: "Agenda Kegiatan", icon: CalendarDays },
          { href: `${base}/pengumuman`, label: "Pengumuman", icon: Megaphone },
          { href: `${base}/galeri`, label: "Galeri", icon: Images },
        ]
      : []),
    { href: `${base}/cetak`, label: "Cetak Papan Info", icon: Printer },
    ...(canManage
      ? [
          { href: `${base}/pengurus`, label: "Pengurus", icon: Users },
          { href: `${base}/pengaturan`, label: "Pengaturan", icon: Settings },
        ]
      : []),
    { href: `${base}/akun`, label: "Akun Saya", icon: UserRound },
  ];

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === base ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
      <div className="hidden md:my-2 md:block md:border-t" />
      <Link href={`/${slug}`} target="_blank" className="hover:bg-accent flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm">
        <ExternalLink className="size-4" /> Lihat Situs
      </Link>
      <button
        type="button"
        onClick={async () => {
          await authClient.signOut();
          router.push("/masuk");
          router.refresh();
        }}
        className="text-destructive hover:bg-destructive/10 flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm"
      >
        <LogOut className="size-4" /> Keluar
      </button>
    </nav>
  );
}
