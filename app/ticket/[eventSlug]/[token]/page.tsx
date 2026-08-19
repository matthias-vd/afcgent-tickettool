import { notFound } from "next/navigation";
import { TicketCard } from "@/components/TicketCard";
import { getRegistrationByToken } from "@/lib/db";
import { qrDataUrl } from "@/lib/qr";

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string; token: string }>;
  searchParams: Promise<{ nieuw?: string; mail?: string }>;
}) {
  const { eventSlug, token } = await params;
  const query = await searchParams;
  const registration = getRegistrationByToken(token);
  if (!registration || registration.eventSlug !== eventSlug) notFound();

  const qr = await qrDataUrl(registration.eventSlug, registration.ticketToken);

  return (
    <div className="flex min-h-full flex-col px-4 py-10 sm:py-16">
      <TicketCard
        eventName={registration.eventName}
        registration={registration}
        qrDataUrl={qr}
        isNew={query.nieuw === "1"}
        emailSent={query.mail === "0" ? false : query.mail === "1" ? true : null}
      />
    </div>
  );
}
