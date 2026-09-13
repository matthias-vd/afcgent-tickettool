import { AdminNav } from "@/components/AdminNav";
import { AttendeeTable } from "@/components/AttendeeTable";
import { requireAdmin } from "@/lib/auth";
import { getEventBySlug, listEvents, listRegistrations } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AttendeesPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const selectedEvent = params.event ? getEventBySlug(params.event) : undefined;
  const rows = listRegistrations(selectedEvent?.id);
  const events = listEvents().map((event) => ({
    slug: event.slug,
    name: event.name,
  }));

  return (
    <div className="flex min-h-full flex-col">
      <AdminNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <p className="text-sm tracking-[0.18em] uppercase text-muted">Aanwezigheid</p>
        <h1 className="serif mt-2 mb-8 text-4xl">Deelnemers</h1>
        <AttendeeTable
          rows={rows}
          events={events}
          selectedEventSlug={selectedEvent?.slug ?? "all"}
        />
      </main>
    </div>
  );
}
