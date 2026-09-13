"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FOOD_OPTIONS } from "@/lib/food";

export function RegisterForm({ eventSlug }: { eventSlug: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        body: data,
      });
      const payload = (await response.json()) as {
        error?: string;
        token?: string;
        eventSlug?: string;
        emailSent?: boolean;
      };

      if (!response.ok || !payload.token || !payload.eventSlug) {
        setError(payload.error ?? "Inschrijven is niet gelukt.");
        return;
      }

      const params = new URLSearchParams({ nieuw: "1" });
      params.set("mail", payload.emailSent ? "1" : "0");
      router.push(
        `/ticket/${payload.eventSlug}/${encodeURIComponent(payload.token)}?${params.toString()}`,
      );
    } catch {
      setError("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <input type="hidden" name="eventSlug" value={eventSlug} />
      <div className="field">
        <label htmlFor="name">Naam</label>
        <input id="name" name="name" autoComplete="name" required maxLength={120} />
      </div>
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="phone">Telefoonnummer</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          placeholder="+32 4xx xx xx xx"
        />
      </div>
      <div className="field">
        <label htmlFor="foodPreference">Voedselvoorkeur</label>
        <select id="foodPreference" name="foodPreference" required defaultValue="">
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
      <div className="field">
        <label htmlFor="extraInfo">Extra info</label>
        <textarea
          id="extraInfo"
          name="extraInfo"
          rows={4}
          maxLength={2000}
          placeholder="Allergieën, opmerkingen, extra context…"
        />
      </div>
      <div className="field">
        <label htmlFor="cv">CV (PDF)</label>
        <input
          id="cv"
          name="cv"
          type="file"
          accept="application/pdf,.pdf"
          required
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
        />
        <p className="text-sm text-muted">
          {fileName ? fileName : "Maximaal 5 MB, alleen PDF."}
        </p>
      </div>

      {error ? (
        <p className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-forest px-5 py-3.5 text-card font-semibold transition hover:bg-navy-hover disabled:opacity-60"
      >
        {pending ? "Bezig met inschrijven…" : "Schrijf me in"}
      </button>
    </form>
  );
}
