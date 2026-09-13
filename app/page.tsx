import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { formatEventDate } from "@/lib/datetime";
import { getOpenEvents } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const events = getOpenEvents();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-20">
        <section className="max-w-2xl pt-4">
          <p className="text-sm tracking-[0.18em] uppercase text-accent">
            Beschikbare events
          </p>
          <h1 className="serif mt-4 text-5xl leading-[1.05] sm:text-6xl">
            Kies een event
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted">
            Hieronder zie je alle events waarvoor je nu kunt inschrijven.
          </p>
        </section>

        {events.length === 0 ? (
          <p className="mt-10 rounded-[28px] border border-line bg-card px-6 py-8 text-muted">
            Er zijn momenteel geen events open voor inschrijving.
          </p>
        ) : (
          <section className="mt-10 grid gap-5 md:grid-cols-2">
            {events.map((event) => (
              <article
                key={event.id}
                className="overflow-hidden rounded-[28px] border border-line bg-card"
              >
                {event.image_stored_name ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/event-image/${event.id}`}
                    alt=""
                    className="h-48 w-full object-cover"
                  />
                ) : null}
                <div className="p-6 sm:p-8">
                  <p className="text-sm tracking-[0.18em] uppercase text-accent">
                    Open voor inschrijving
                  </p>
                  <h2 className="serif mt-3 text-3xl">{event.name}</h2>
                  <p className="mt-4 text-muted">{event.intro}</p>
                  <dl className="mt-6 grid gap-3 text-sm">
                    <div>
                      <dt className="text-muted">Wanneer</dt>
                      <dd className="mt-1 text-base">
                        {formatEventDate(event.date)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Waar</dt>
                      <dd className="mt-1 text-base">{event.location}</dd>
                    </div>
                  </dl>
                  <Link
                    href={`/events/${event.slug}`}
                    className="mt-7 inline-flex rounded-full bg-forest px-5 py-3 text-sm font-semibold text-card"
                  >
                    Inschrijven
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}

        <p className="mt-12">
          <Link href="/afgelopen" className="text-sm font-semibold text-forest">
            Bekijk afgelopen events →
          </Link>
        </p>
      </main>
    </div>
  );
}
