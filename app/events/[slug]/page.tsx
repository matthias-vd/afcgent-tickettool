import Link from "next/link";
import { notFound } from "next/navigation";
import { RegisterForm } from "@/components/RegisterForm";
import { SiteHeader } from "@/components/SiteHeader";
import { formatEventDate } from "@/lib/datetime";
import { getEventBySlug, isEventAcceptingRegistrations } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EventRegistrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event || event.archived) notFound();

  const open = isEventAcceptingRegistrations(event);
  const description = event.description?.trim();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-6 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <section className="max-w-xl pt-4">
          {event.image_stored_name ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/event-image/${event.id}`}
              alt=""
              className="mb-8 h-56 w-full rounded-[28px] object-cover"
            />
          ) : null}
          <p className="text-sm tracking-[0.18em] uppercase text-accent">
            {open ? "Live inschrijving" : "Inschrijving gesloten"}
          </p>
          <h1 className="serif mt-4 text-5xl leading-[1.05] sm:text-6xl">
            {event.name}
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-muted">
            {event.intro}
          </p>
          {description ? (
            <div className="mt-6 max-w-md whitespace-pre-wrap text-base leading-8 text-ink">
              {description}
            </div>
          ) : null}
          <dl className="mt-10 grid gap-5 text-sm">
            <div>
              <dt className="text-muted">Wanneer</dt>
              <dd className="mt-1 text-base">{formatEventDate(event.date)}</dd>
            </div>
            <div>
              <dt className="text-muted">Waar</dt>
              <dd className="mt-1 text-base">{event.location}</dd>
            </div>
            {(event.registration_opens_at || event.registration_closes_at) && (
              <div>
                <dt className="text-muted">Inschrijfperiode</dt>
                <dd className="mt-1 text-base">
                  {event.registration_opens_at
                    ? formatEventDate(event.registration_opens_at)
                    : "Nu"}
                  {" → "}
                  {event.registration_closes_at
                    ? formatEventDate(event.registration_closes_at)
                    : "geen einddatum"}
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-8">
            <Link href="/" className="text-sm text-muted hover:text-ink">
              ← Alle events
            </Link>
          </p>
        </section>
        <section className="rounded-[28px] border border-line bg-card p-6 sm:p-8">
          {open ? (
            <>
              <h2 className="serif text-3xl">Je gegevens</h2>
              <p className="mt-2 mb-8 text-sm text-muted">
                Alle velden zijn verplicht, behalve extra info (tenzij je
                “Andere” kiest bij eten).
              </p>
              <RegisterForm eventSlug={event.slug} />
            </>
          ) : (
            <>
              <h2 className="serif text-3xl">Niet beschikbaar</h2>
              <p className="mt-4 text-muted">
                Inschrijven voor dit event is momenteel niet mogelijk.
              </p>
              <Link
                href="/afgelopen"
                className="mt-8 inline-flex rounded-full border border-line px-5 py-3 text-sm font-semibold"
              >
                Bekijk afgelopen events
              </Link>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
