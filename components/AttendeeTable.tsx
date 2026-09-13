"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/datetime";
import { foodLabel } from "@/lib/food";
import type { Registration } from "@/lib/types";

type EventOption = {
  slug: string;
  name: string;
};

export function AttendeeTable({
  rows,
  events,
  selectedEventSlug,
}: {
  rows: Registration[];
  events: EventOption[];
  selectedEventSlug: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "present" | "absent">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "present" && !row.checkedInAt) return false;
      if (filter === "absent" && row.checkedInAt) return false;
      if (!needle) return true;
      return [row.name, row.email, row.phone, foodLabel(row.foodPreference)]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [filter, query, rows]);

  async function toggle(row: Registration) {
    setBusyId(row.id);
    await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        row.checkedInAt ? { id: row.id, undo: true } : { id: row.id },
      ),
    });
    router.refresh();
    setBusyId(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={selectedEventSlug}
          onChange={(event) => {
            const value = event.target.value;
            window.location.href =
              value === "all" ? "/admin/deelnemers" : `/admin/deelnemers?event=${value}`;
          }}
          className="w-full rounded-2xl border border-line bg-card px-4 py-3 sm:max-w-xs"
        >
          <option value="all">Alle events</option>
          {events.map((event) => (
            <option key={event.slug} value={event.slug}>
              {event.name}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Zoek op naam, e-mail of telefoon"
          className="w-full rounded-2xl border border-line bg-card px-4 py-3 sm:max-w-sm"
        />
        <div className="flex gap-2">
          {(
            [
              ["all", "Alle"],
              ["present", "Aanwezig"],
              ["absent", "Afwezig"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-2 text-sm ${
                filter === value ? "bg-forest text-card" : "border border-line"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <a
          href={
            selectedEventSlug === "all"
              ? "/api/export"
              : `/api/export?event=${selectedEventSlug}`
          }
          className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-card sm:ml-auto"
        >
          Exporteer CSV
        </a>
      </div>

      <p className="text-sm text-muted">{filtered.length} resultaten</p>

      <div className="overflow-x-auto rounded-[28px] border border-line bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Naam</th>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Eten</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Acties</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-line/70 align-top">
                <td className="px-4 py-4">
                  <p className="font-semibold">{row.name}</p>
                  {row.extraInfo ? (
                    <p className="mt-1 max-w-xs text-muted">{row.extraInfo}</p>
                  ) : null}
                </td>
                <td className="px-4 py-4">{row.eventName}</td>
                <td className="px-4 py-4">
                  <p>{row.email}</p>
                  <p className="text-muted">{row.phone}</p>
                </td>
                <td className="px-4 py-4">{foodLabel(row.foodPreference)}</td>
                <td className="px-4 py-4">
                  {row.checkedInAt ? (
                    <span>
                      Aanwezig
                      <span className="block text-muted">
                        {formatDateTime(row.checkedInAt)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted">Nog niet binnen</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col items-start gap-2">
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => toggle(row)}
                      className="rounded-full border border-line px-3 py-1.5"
                    >
                      {row.checkedInAt ? "Check-in ongedaan" : "Check in"}
                    </button>
                    <a href={`/api/cv/${row.id}`} className="text-muted underline">
                      Download CV
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-muted">Geen deelnemers gevonden.</p>
        ) : null}
      </div>
    </div>
  );
}
