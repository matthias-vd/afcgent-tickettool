"use client";

import Link from "next/link";
import { formatEventDate } from "@/lib/datetime";
import { foodLabel } from "@/lib/food";
import type { Registration } from "@/lib/types";

export function TicketCard({
  eventName,
  eventDate,
  eventLocation,
  registration,
  qrDataUrl,
  isNew,
  emailSent,
}: {
  eventName: string;
  eventDate: string;
  eventLocation: string;
  registration: Registration;
  qrDataUrl: string;
  isNew?: boolean;
  emailSent?: boolean | null;
}) {
  return (
    <article className="ticket-card mx-auto w-full max-w-xl overflow-hidden rounded-[28px]">
      <div className="flex flex-col gap-8 p-7 sm:p-10">
        {isNew ? (
          <p className="no-print text-sm tracking-[0.18em] uppercase text-ok">
            Inschrijving bevestigd
          </p>
        ) : (
          <p className="text-sm tracking-[0.18em] uppercase text-muted">Ticket</p>
        )}
        <div>
          <h1 className="serif text-4xl leading-tight sm:text-5xl">{eventName}</h1>
          <p className="mt-3 text-muted">
            {formatEventDate(eventDate)}
            <span className="mx-2">·</span>
            {eventLocation}
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="space-y-3">
            <p className="text-sm text-muted">Gast</p>
            <p className="serif text-3xl">{registration.name}</p>
            <p className="text-muted">{registration.email}</p>
            <p className="text-sm">Eten: {foodLabel(registration.foodPreference)}</p>
          </div>
          {/* QR is a generated data URL, not a remote asset. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR-code voor check-in"
            width={220}
            height={220}
            className="mx-auto h-52 w-52 rounded-2xl bg-card"
          />
        </div>
        {isNew && emailSent === false ? (
          <p className="no-print rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm">
            We konden geen e-mail versturen. Sla deze pagina op of maak een screenshot
            van je QR-code.
          </p>
        ) : isNew ? (
          <p className="no-print text-sm text-muted">
            Je ticket staat ook in je mailbox. Toon deze QR-code aan de ingang.
          </p>
        ) : null}
        <div className="no-print flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-card"
          >
            Print of bewaar
          </button>
          <Link
            href="/"
            className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold"
          >
            Terug naar inschrijving
          </Link>
        </div>
      </div>
    </article>
  );
}
