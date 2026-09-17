import { notFound } from "next/navigation";
import { CancelRegistrationClient } from "@/components/CancelRegistrationClient";
import { getRegistrationByToken } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CancelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);
  const registration = getRegistrationByToken(token);
  if (!registration) notFound();

  return (
    <CancelRegistrationClient
      registration={{
        name: registration.name,
        email: registration.email,
        eventName: registration.eventName,
        ticketToken: registration.ticketToken,
        cancelledAt: registration.cancelledAt,
      }}
    />
  );
}
