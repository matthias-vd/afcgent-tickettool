import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/datetime";
import { getEventStats, getStats, listRegistrations } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  await requireAdmin();
  const events = getEventStats();
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
        <h1 className="serif mt-2 text-4xl sm:text-5xl">Alle events</h1>
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
          <h2 className="serif text-2xl">Vergelijking per event</h2>
          <div className="mt-4 overflow-x-auto rounded-[28px] border border-line bg-card">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Ingeschreven</th>
                  <th className="px-4 py-3 font-medium">Aanwezig</th>
                  <th className="px-4 py-3 font-medium">Nog niet binnen</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const present = event.present ?? 0;
                  const absent = event.total - present;
                  return (
                    <tr key={event.id} className="border-b border-line/70">
                      <td className="px-4 py-4">
                        <p className="font-semibold">{event.name}</p>
                        <p className="text-xs text-muted">{event.slug}</p>
                      </td>
                      <td className="px-4 py-4">{event.total}</td>
                      <td className="px-4 py-4">{present}</td>
                      <td className="px-4 py-4">{absent}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                    <p className="text-sm text-muted">
                      {row.email} · {row.eventName}
                    </p>
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
