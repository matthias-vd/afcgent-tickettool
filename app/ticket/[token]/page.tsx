import { notFound } from "next/navigation";
import { TicketCard } from "@/components/TicketCard";
import { getEvent } from "@/lib/config";
import { getRegistrationByToken } from "@/lib/db";
import { qrDataUrl } from "@/lib/qr";

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ nieuw?: string; mail?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const registration = getRegistrationByToken(token);
  if (!registration) notFound();

  const event = getEvent();
  const qr = await qrDataUrl(registration.ticketToken);

  return (
    <div className="flex min-h-full flex-col px-4 py-10 sm:py-16">
      <TicketCard
        eventName={event.name}
        eventDate={event.date}
        eventLocation={event.location}
        registration={registration}
        qrDataUrl={qr}
        isNew={query.nieuw === "1"}
        emailSent={query.mail === "0" ? false : query.mail === "1" ? true : null}
      />
    </div>
  );
}
