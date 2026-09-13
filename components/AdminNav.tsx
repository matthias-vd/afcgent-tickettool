"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "Overzicht" },
  { href: "/admin/scanner", label: "Scanner" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/deelnemers", label: "Deelnemers" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="border-b border-line bg-card/70">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <p className="text-sm tracking-[0.18em] uppercase text-muted">Poort</p>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map((link) => {
            const active =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm ${
                  active ? "bg-forest text-card" : "text-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={logout}
            className="rounded-full px-4 py-2 text-sm text-muted hover:text-ink"
          >
            Uitloggen
          </button>
        </nav>
      </div>
    </header>
  );
}
