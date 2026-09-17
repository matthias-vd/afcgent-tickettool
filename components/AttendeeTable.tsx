"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneInput } from "@/components/PhoneInput";
import { formatDateTime } from "@/lib/datetime";
import { FOOD_OPTIONS, foodLabel } from "@/lib/food";
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
  const [filter, setFilter] = useState<"all" | "present" | "absent" | "cancelled">(
    "all",
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addPending, setAddPending] = useState(false);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [addFood, setAddFood] = useState("");
  const addExtraRequired = addFood === "andere";

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "cancelled" && !row.cancelledAt) return false;
      if (filter === "present" && (row.cancelledAt || !row.checkedInAt)) return false;
      if (filter === "absent" && (row.cancelledAt || row.checkedInAt)) return false;
      if (!needle) return true;
      return [row.name, row.email, row.phone, row.eventName, foodLabel(row.foodPreference)]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [filter, query, rows]);

  async function toggle(row: Registration) {
    if (row.cancelledAt) return;
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

  async function remove(row: Registration) {
    const confirmed = window.confirm(
      `Deelnemer “${row.name}” (${row.email}) verwijderen van ${row.eventName}?`,
    );
    if (!confirmed) return;

    setBusyId(row.id);
    setAddError(null);
    const response = await fetch("/api/admin/attendees", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id }),
    });
    const payload = (await response.json()) as { error?: string };
    setBusyId(null);

    if (!response.ok) {
      setAddError(payload.error ?? "Verwijderen is niet gelukt.");
      return;
    }

    router.refresh();
  }

  async function onAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddError(null);
    setAddSuccess(null);
    setAddPending(true);

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("/api/admin/attendees", {
        method: "POST",
        body: data,
      });
      const payload = (await response.json()) as {
        error?: string;
        ticketPath?: string;
        emailSent?: boolean;
      };

      if (!response.ok) {
        setAddError(payload.error ?? "Toevoegen is niet gelukt.");
        return;
      }

      form.reset();
      setAddFood("");
      setAddSuccess(
        payload.ticketPath
          ? `Deelnemer toegevoegd.${payload.emailSent ? " Mail verzonden." : ""}`
          : "Deelnemer toegevoegd.",
      );
      setShowAddForm(false);
      router.refresh();
    } catch {
      setAddError("Er ging iets mis. Probeer opnieuw.");
    } finally {
      setAddPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
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
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Alle"],
              ["present", "Aanwezig"],
              ["absent", "Afwezig"],
              ["cancelled", "Uitgeschreven"],
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
        <button
          type="button"
          onClick={() => {
            setShowAddForm((open) => !open);
            setAddError(null);
            setAddSuccess(null);
          }}
          className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold"
        >
          {showAddForm ? "Formulier sluiten" : "Deelnemer toevoegen"}
        </button>
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

      {showAddForm ? (
        <form
          onSubmit={onAdd}
          className="grid gap-4 rounded-[28px] border border-line bg-card p-5 sm:grid-cols-2"
        >
          <div className="field sm:col-span-2">
            <label htmlFor="admin-eventSlug">Event</label>
            <select
              id="admin-eventSlug"
              name="eventSlug"
              required
              defaultValue={selectedEventSlug === "all" ? "" : selectedEventSlug}
              className="w-full rounded-2xl border border-line bg-card px-4 py-3"
            >
              <option value="" disabled>
                Kies een event
              </option>
              {events.map((event) => (
                <option key={event.slug} value={event.slug}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="admin-name">Naam</label>
            <input
              id="admin-name"
              name="name"
              required
              maxLength={120}
              className="w-full rounded-2xl border border-line bg-card px-4 py-3"
            />
          </div>
          <div className="field">
            <label htmlFor="admin-email">E-mail</label>
            <input
              id="admin-email"
              name="email"
              type="email"
              required
              className="w-full rounded-2xl border border-line bg-card px-4 py-3"
            />
          </div>
          <div className="field">
            <label htmlFor="admin-phone">Telefoon</label>
            <PhoneInput
              id="admin-phone"
              name="phone"
              required
              className="w-full rounded-2xl border border-line bg-card px-4 py-3"
            />
          </div>
          <div className="field">
            <label htmlFor="admin-foodPreference">Voedselvoorkeur</label>
            <select
              id="admin-foodPreference"
              name="foodPreference"
              required
              value={addFood}
              onChange={(event) => setAddFood(event.target.value)}
              className="w-full rounded-2xl border border-line bg-card px-4 py-3"
            >
              <option value="" disabled>
                Kies een optie
              </option>
              {FOOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field sm:col-span-2">
            <label htmlFor="admin-extraInfo">
              Extra info
              {addExtraRequired ? " (verplicht bij Andere)" : ""}
            </label>
            <textarea
              id="admin-extraInfo"
              name="extraInfo"
              rows={3}
              maxLength={2000}
              required={addExtraRequired}
              className="w-full rounded-2xl border border-line bg-card px-4 py-3"
            />
          </div>
          <div className="field sm:col-span-2">
            <label htmlFor="admin-cv">CV (PDF, optioneel, max. 15 MB)</label>
            <input
              id="admin-cv"
              name="cv"
              type="file"
              accept="application/pdf,.pdf"
              className="w-full rounded-2xl border border-line bg-card px-4 py-3"
            />
          </div>
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <input type="checkbox" name="sendEmail" value="1" />
            Bevestigingsmail sturen (als SMTP geconfigureerd is)
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={addPending}
              className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-card disabled:opacity-60"
            >
              {addPending ? "Bezig…" : "Deelnemer opslaan"}
            </button>
          </div>
        </form>
      ) : null}

      {addError ? (
        <p className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          {addError}
        </p>
      ) : null}
      {addSuccess ? (
        <p className="rounded-2xl border border-line bg-card px-4 py-3 text-sm text-muted">
          {addSuccess}
        </p>
      ) : null}

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
              <tr
                key={row.id}
                className={`border-b border-line/70 align-top ${
                  row.cancelledAt ? "bg-accent/5 text-accent" : ""
                }`}
              >
                <td className="px-4 py-4">
                  <p className={`font-semibold ${row.cancelledAt ? "text-accent" : ""}`}>
                    {row.name}
                  </p>
                  {row.extraInfo ? (
                    <p
                      className={`mt-1 max-w-xs ${
                        row.cancelledAt ? "text-accent/80" : "text-muted"
                      }`}
                    >
                      {row.extraInfo}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-4">{row.eventName}</td>
                <td className="px-4 py-4">
                  <p>{row.email}</p>
                  <p className={row.cancelledAt ? "text-accent/80" : "text-muted"}>
                    {row.phone}
                  </p>
                </td>
                <td className="px-4 py-4">{foodLabel(row.foodPreference)}</td>
                <td className="px-4 py-4">
                  {row.cancelledAt ? (
                    <span className="font-semibold text-accent">
                      Uitgeschreven
                      <span className="block font-normal text-accent/80">
                        {formatDateTime(row.cancelledAt)}
                      </span>
                      <span className="mt-1 block text-xs font-normal text-accent/70">
                        Was ingeschreven op {formatDateTime(row.createdAt)}
                      </span>
                    </span>
                  ) : row.checkedInAt ? (
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
                    {!row.cancelledAt ? (
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => toggle(row)}
                        className="rounded-full border border-line px-3 py-1.5"
                      >
                        {row.checkedInAt ? "Check-in ongedaan" : "Check in"}
                      </button>
                    ) : null}
                    {row.cvStoredName ? (
                      <a href={`/api/cv/${row.id}`} className="text-muted underline">
                        Download CV
                      </a>
                    ) : null}
                    {!row.cancelledAt ? (
                      <a
                        href={`/ticket/${row.eventSlug}/${encodeURIComponent(row.ticketToken)}`}
                        className="text-muted underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open ticket
                      </a>
                    ) : null}
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => remove(row)}
                      className="rounded-full border border-accent/40 px-3 py-1.5 text-accent"
                    >
                      Verwijderen
                    </button>
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
