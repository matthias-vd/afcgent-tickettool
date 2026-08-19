import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { getEvent } from "@/lib/config";
import { formatDateTime } from "@/lib/datetime";
import { getStats, listRegistrations } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  await requireAdmin();
  const event = getEvent();
  const stats = getStats();
  const recent = listRegistrations()
    .filter((row) => row.checkedInAt)
    .sort((a, b) => (b.checkedInAt ?? "").localeCompare(a.checkedInAt ?? ""))
    .slice(0, 6);
  const rate =
    stats.total === 0 ? 0 : Math.round((stats.present / stats.total) * 100);

  return (
    <div className="flex min-h-full flex-col">
      <AdminNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <p className="text-sm tracking-[0.18em] uppercase text-muted">Dashboard</p>
        <h1 className="serif mt-2 text-4xl sm:text-5xl">{event.name}</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Aanwezigheid van ingeschreven gasten. Scan aan de deur of exporteer de
          volledige lijst.
        </p>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          <Stat label="Ingeschreven" value={String(stats.total)} />
          <Stat label="Aanwezig" value={String(stats.present)} hint={`${rate}% van de inschrijvingen`} />
          <Stat label="Nog niet binnen" value={String(stats.absent)} />
        </section>

        <section className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/admin/scanner"
            className="rounded-full bg-forest px-5 py-3 text-sm font-semibold text-card"
          >
            Open scanner
          </Link>
          <Link
            href="/admin/deelnemers"
            className="rounded-full border border-line px-5 py-3 text-sm font-semibold"
          >
            Deelnemerslijst
          </Link>
          <a
            href="/api/export"
            className="rounded-full border border-line px-5 py-3 text-sm font-semibold"
          >
            Exporteer CSV
          </a>
        </section>

        <section className="mt-12">
          <h2 className="serif text-2xl">Laatste check-ins</h2>
          {recent.length === 0 ? (
            <p className="mt-4 text-muted">Nog niemand gescand.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-3xl border border-line bg-card">
              {recent.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-sm text-muted">{row.email}</p>
                  </div>
                  <p className="text-sm text-muted">{formatDateTime(row.checkedInAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border border-line bg-card px-6 py-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="serif mt-2 text-4xl">{value}</p>
      {hint ? <p className="mt-2 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}
