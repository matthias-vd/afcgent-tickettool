"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { formatDateTime } from "@/lib/datetime";
import type { Registration } from "@/lib/types";

export function CancelRegistrationClient({
  registration,
}: {
  registration: Pick<
    Registration,
    "name" | "email" | "eventName" | "ticketToken" | "cancelledAt"
  >;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelledAt, setCancelledAt] = useState(registration.cancelledAt);

  async function onCancel() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: registration.ticketToken }),
      });
      const payload = (await response.json()) as {
        error?: string;
        registration?: { cancelledAt: string | null };
      };
      if (!response.ok || !payload.registration?.cancelledAt) {
        setError(payload.error ?? "Annuleren is niet gelukt.");
        return;
      }
      setCancelledAt(payload.registration.cancelledAt);
    } catch {
      setError("Er ging iets mis. Probeer opnieuw.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 pb-20 pt-4">
        <p className="text-sm tracking-[0.18em] uppercase text-accent">
          Inschrijving
        </p>
        <h1 className="serif mt-4 text-4xl sm:text-5xl">
          {cancelledAt ? "Je bent uitgeschreven" : "Inschrijving annuleren"}
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted">
          {cancelledAt
            ? `Je ticket voor “${registration.eventName}” is niet meer geldig.`
            : `Hallo ${registration.name}, bevestig hieronder als je je wilt uitschrijven voor “${registration.eventName}”.`}
        </p>
        <dl className="mt-8 grid gap-3 text-sm">
          <div>
            <dt className="text-muted">E-mail</dt>
            <dd className="mt-1 text-base">{registration.email}</dd>
          </div>
          {cancelledAt ? (
            <div>
              <dt className="text-muted">Uitgeschreven op</dt>
              <dd className="mt-1 text-base">{formatDateTime(cancelledAt)}</dd>
            </div>
          ) : null}
        </dl>

        {error ? (
          <p className="mt-6 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
            {error}
          </p>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          {!cancelledAt ? (
            <button
              type="button"
              disabled={pending}
              onClick={onCancel}
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-card disabled:opacity-60"
            >
              {pending ? "Bezig…" : "Ja, schrijf me uit"}
            </button>
          ) : null}
          <Link
            href="/"
            className="rounded-full border border-line px-5 py-3 text-sm font-semibold"
          >
            Terug naar events
          </Link>
        </div>
      </main>
    </div>
  );
}
