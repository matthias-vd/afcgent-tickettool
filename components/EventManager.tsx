"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatEventDate, isoToBrusselsInput } from "@/lib/datetime";
import type { DbEvent } from "@/lib/db";

export type EventStatsRow = DbEvent & {
  total: number;
  present: number | null;
};

type FormState = {
  id?: string;
  name: string;
  slug: string;
  date: string;
  location: string;
  intro: string;
  isOpen: boolean;
  archived: boolean;
  registrationOpensAt: string;
  registrationClosesAt: string;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  date: "",
  location: "",
  intro: "",
  isOpen: true,
  archived: false,
  registrationOpensAt: "",
  registrationClosesAt: "",
};

function toForm(event?: EventStatsRow): FormState {
  if (!event) return emptyForm;
  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    date: isoToBrusselsInput(event.date) || event.date.slice(0, 16),
    location: event.location,
    intro: event.intro,
    isOpen: Boolean(event.is_open),
    archived: Boolean(event.archived),
    registrationOpensAt: isoToBrusselsInput(event.registration_opens_at),
    registrationClosesAt: isoToBrusselsInput(event.registration_closes_at),
  };
}

export function EventManager({ events }: { events: EventStatsRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...events].sort((a, b) => {
        if (a.archived !== b.archived) return a.archived - b.archived;
        return a.date.localeCompare(b.date);
      }),
    [events],
  );

  function openCreate() {
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
    setMessage(null);
  }

  function openEdit(event: EventStatsRow) {
    setForm(toForm(event));
    setShowForm(true);
    setError(null);
    setMessage(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const data = new FormData();
    if (form.id) data.set("id", form.id);
    data.set("name", form.name);
    data.set("slug", form.slug);
    data.set("date", form.date);
    data.set("location", form.location);
    data.set("intro", form.intro);
    data.set("isOpen", form.isOpen ? "1" : "0");
    data.set("archived", form.archived ? "1" : "0");
    data.set("registrationOpensAt", form.registrationOpensAt);
    data.set("registrationClosesAt", form.registrationClosesAt);

    try {
      const response = await fetch("/api/admin/events", {
        method: form.id ? "PUT" : "POST",
        body: data,
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Opslaan is niet gelukt.");
        return;
      }
      setMessage(form.id ? "Event bijgewerkt." : "Event toegevoegd.");
      setShowForm(false);
      setForm(emptyForm);
      router.refresh();
    } catch {
      setError("Er ging iets mis. Probeer opnieuw.");
    } finally {
      setPending(false);
    }
  }

  async function toggleArchive(row: EventStatsRow) {
    const next = !row.archived;
    const confirmed = window.confirm(
      next
        ? `“${row.name}” archiveren? Het verdwijnt van de homepage en komt bij Afgelopen events.`
        : `“${row.name}” terugzetten uit het archief?`,
    );
    if (!confirmed) return;

    setBusyId(row.id);
    setError(null);
    const response = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, archived: Boolean(next) }),
    });
    const payload = (await response.json()) as { error?: string };
    setBusyId(null);
    if (!response.ok) {
      setError(payload.error ?? "Archiveren is niet gelukt.");
      return;
    }
    router.refresh();
  }

  async function remove(row: EventStatsRow) {
    const confirmed = window.confirm(
      `Event “${row.name}” en alle ${row.total} inschrijving(en) definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`,
    );
    if (!confirmed) return;

    setBusyId(row.id);
    setError(null);
    const response = await fetch("/api/admin/events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id }),
    });
    const payload = (await response.json()) as { error?: string };
    setBusyId(null);
    if (!response.ok) {
      setError(payload.error ?? "Verwijderen is niet gelukt.");
      return;
    }
    if (form.id === row.id) {
      setShowForm(false);
      setForm(emptyForm);
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (showForm && !form.id) {
              setShowForm(false);
              return;
            }
            openCreate();
          }}
          className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold"
        >
          {showForm && !form.id ? "Formulier sluiten" : "Event toevoegen"}
        </button>
      </div>

      {showForm ? (
        <form
          onSubmit={onSubmit}
          className="grid gap-4 rounded-[28px] border border-line bg-card p-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <h2 className="serif text-2xl">
              {form.id ? "Event bewerken" : "Nieuw event"}
            </h2>
          </div>
          <label className="grid gap-2 text-sm">
            <span>Naam</span>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              className="rounded-2xl border border-line bg-card px-4 py-3"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Slug (optioneel)</span>
            <input
              value={form.slug}
              onChange={(event) =>
                setForm((current) => ({ ...current, slug: event.target.value }))
              }
              placeholder="wordt uit de naam gehaald"
              className="rounded-2xl border border-line bg-card px-4 py-3"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Eventdatum</span>
            <input
              required
              type="datetime-local"
              value={form.date}
              onChange={(event) =>
                setForm((current) => ({ ...current, date: event.target.value }))
              }
              className="rounded-2xl border border-line bg-card px-4 py-3"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Locatie</span>
            <input
              required
              value={form.location}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  location: event.target.value,
                }))
              }
              className="rounded-2xl border border-line bg-card px-4 py-3"
            />
          </label>
          <label className="grid gap-2 text-sm sm:col-span-2">
            <span>Intro</span>
            <textarea
              required
              rows={3}
              value={form.intro}
              onChange={(event) =>
                setForm((current) => ({ ...current, intro: event.target.value }))
              }
              className="rounded-2xl border border-line bg-card px-4 py-3"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Inschrijving open vanaf</span>
            <input
              type="datetime-local"
              value={form.registrationOpensAt}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  registrationOpensAt: event.target.value,
                }))
              }
              className="rounded-2xl border border-line bg-card px-4 py-3"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Inschrijving open tot</span>
            <input
              type="datetime-local"
              value={form.registrationClosesAt}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  registrationClosesAt: event.target.value,
                }))
              }
              className="rounded-2xl border border-line bg-card px-4 py-3"
            />
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.isOpen}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isOpen: event.target.checked,
                }))
              }
            />
            Handmatig open voor inschrijving
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.archived}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  archived: event.target.checked,
                }))
              }
            />
            Gearchiveerd (afgelopen events)
          </label>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-card disabled:opacity-60"
            >
              {pending ? "Bezig…" : form.id ? "Wijzigingen opslaan" : "Event opslaan"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm);
              }}
              className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold"
            >
              Annuleren
            </button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-2xl border border-line bg-card px-4 py-3 text-sm text-muted">
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-[28px] border border-line bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Inschrijving</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Inschrijvingen</th>
              <th className="px-4 py-3 font-medium">Acties</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.id} className="border-b border-line/70 align-top">
                <td className="px-4 py-4">
                  <p className="font-semibold">{row.name}</p>
                  <p className="text-xs text-muted">{row.slug}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatEventDate(row.date)} · {row.location}
                  </p>
                </td>
                <td className="px-4 py-4 text-xs text-muted">
                  <p>
                    van{" "}
                    {row.registration_opens_at
                      ? formatEventDate(row.registration_opens_at)
                      : "—"}
                  </p>
                  <p>
                    tot{" "}
                    {row.registration_closes_at
                      ? formatEventDate(row.registration_closes_at)
                      : "—"}
                  </p>
                </td>
                <td className="px-4 py-4">
                  {row.archived ? (
                    <span className="rounded-full bg-line px-3 py-1 text-xs">
                      Gearchiveerd
                    </span>
                  ) : row.is_open ? (
                    <span className="rounded-full bg-forest/10 px-3 py-1 text-xs text-forest">
                      Open
                    </span>
                  ) : (
                    <span className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
                      Gesloten
                    </span>
                  )}
                </td>
                <td className="px-4 py-4">{row.total}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-col items-start gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="text-sm font-semibold text-forest"
                    >
                      Bewerken
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => toggleArchive(row)}
                      className="text-sm text-muted hover:text-ink disabled:opacity-50"
                    >
                      {row.archived ? "Dearchiveren" : "Archiveren"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => remove(row)}
                      className="text-sm text-accent hover:underline disabled:opacity-50"
                    >
                      Verwijderen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
