import { AdminNav } from "@/components/AdminNav";
import { EventManager } from "@/components/EventManager";
import { requireAdmin } from "@/lib/auth";
import { getEventStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  await requireAdmin();
  const events = getEventStats();

  return (
    <div className="flex min-h-full flex-col">
      <AdminNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <p className="text-sm tracking-[0.18em] uppercase text-muted">Beheer</p>
        <h1 className="serif mt-2 text-4xl sm:text-5xl">Events</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Voeg events toe, stel inschrijfperiodes in, archiveer afgelopen events of
          verwijder alles inclusief inschrijvingen.
        </p>
        <div className="mt-10">
          <EventManager events={events} />
        </div>
      </main>
    </div>
  );
}
