import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";
import { checkInRegistration, getEventBySlug, undoCheckIn } from "@/lib/db";
import { parseTicketPayload } from "@/lib/ticket";

export const runtime = "nodejs";

async function assertAdmin() {
  const jar = await cookies();
  return isValidSession(jar.get(SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const body = (await request.json()) as {
    payload?: string;
    token?: string;
    id?: string;
    email?: string;
    eventSlug?: string;
    undo?: boolean;
  };

  if (body.undo && body.id) {
    const registration = undoCheckIn(body.id);
    if (!registration) {
      return NextResponse.json({ error: "Ticket niet gevonden." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, registration, undone: true });
  }

  const event = body.eventSlug ? getEventBySlug(body.eventSlug) : null;
  if (body.eventSlug && !event) {
    return NextResponse.json({ error: "Onbekend event." }, { status: 404 });
  }

  const token = body.token || (body.payload ? parseTicketPayload(body.payload) : null);
  const result = checkInRegistration({
    token: token || undefined,
    id: body.id,
    email: body.email?.trim(),
    eventId: event?.id,
  });

  if (result && "ambiguous" in result) {
    return NextResponse.json(
      {
        error:
          "Deze e-mail komt in meerdere events voor. Kies eerst een specifiek event.",
      },
      { status: 409 },
    );
  }

  if (!result) {
    return NextResponse.json(
      { error: "Onbekend ticket. Deze QR-code staat niet in de lijst." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    alreadyCheckedIn: result.alreadyCheckedIn,
    name: result.registration.name,
    email: result.registration.email,
    foodPreference: result.registration.foodPreference,
    checkedInAt: result.registration.checkedInAt,
    id: result.registration.id,
    eventName: result.registration.eventName,
  });
}
