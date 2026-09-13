import { AdminNav } from "@/components/AdminNav";
import { CheckinScanner } from "@/components/CheckinScanner";
import { requireAdmin } from "@/lib/auth";
import { listEvents } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ScannerPage() {
  await requireAdmin();
  const events = listEvents().map((event) => ({
    slug: event.slug,
    name: event.name,
  }));

  return (
    <div className="flex min-h-full flex-col">
      <AdminNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <p className="text-sm tracking-[0.18em] uppercase text-muted">Ingang</p>
        <h1 className="serif mt-2 mb-8 text-4xl">QR-scanner</h1>
        <CheckinScanner events={events} />
      </main>
    </div>
  );
}
