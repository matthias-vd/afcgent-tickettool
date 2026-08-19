import Link from "next/link";
import { RegisterForm } from "@/components/RegisterForm";
import { getEvent } from "@/lib/config";
import { formatEventDate } from "@/lib/datetime";

export default function HomePage() {
  const event = getEvent();

  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <p className="text-sm tracking-[0.2em] uppercase text-muted">Inschrijving</p>
        <Link href="/admin/login" className="text-sm text-muted hover:text-ink">
          Organisatie
        </Link>
      </header>
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-6 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <section className="max-w-xl pt-4">
          <p className="text-sm tracking-[0.18em] uppercase text-accent">Live inschrijving</p>
          <h1 className="serif mt-4 text-5xl leading-[1.05] sm:text-6xl">{event.name}</h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-muted">{event.intro}</p>
          <dl className="mt-10 grid gap-5 text-sm">
            <div>
              <dt className="text-muted">Wanneer</dt>
              <dd className="mt-1 text-base">{formatEventDate(event.date)}</dd>
            </div>
            <div>
              <dt className="text-muted">Waar</dt>
              <dd className="mt-1 text-base">{event.location}</dd>
            </div>
            <div>
              <dt className="text-muted">Na inschrijving</dt>
              <dd className="mt-1 text-base">
                Je krijgt een e-mail met QR-code. Die scannen we aan de deur.
              </dd>
            </div>
          </dl>
        </section>
        <section className="rounded-[28px] border border-line bg-card p-6 sm:p-8">
          <h2 className="serif text-3xl">Je gegevens</h2>
          <p className="mt-2 mb-8 text-sm text-muted">
            Alle velden zijn verplicht, behalve extra info.
          </p>
          <RegisterForm />
        </section>
      </main>
    </div>
  );
}
