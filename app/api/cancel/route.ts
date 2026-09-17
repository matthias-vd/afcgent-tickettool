import { NextRequest, NextResponse } from "next/server";
import { cancelRegistration, getRegistrationByToken } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    token?: string;
  } | null;
  const token = body?.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Geen ticket opgegeven." }, { status: 400 });
  }

  const existing = getRegistrationByToken(token);
  if (!existing) {
    return NextResponse.json({ error: "Inschrijving niet gevonden." }, { status: 404 });
  }

  const registration = cancelRegistration(token);
  if (!registration) {
    return NextResponse.json({ error: "Annuleren mislukt." }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    alreadyCancelled: Boolean(existing.cancelledAt),
    registration: {
      id: registration.id,
      name: registration.name,
      email: registration.email,
      eventName: registration.eventName,
      cancelledAt: registration.cancelledAt,
    },
  });
}
