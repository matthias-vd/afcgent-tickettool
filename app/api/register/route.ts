import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  createRegistration,
  getEventBySlug,
  getRegistrationByEmail,
  isEventAcceptingRegistrations,
  getUploadDir,
} from "@/lib/db";
import { sendTicketEmail } from "@/lib/email";
import { FOOD_OPTIONS } from "@/lib/food";
import { mintTicketToken } from "@/lib/ticket-token";
import { registrationFields } from "@/lib/validation";

export const runtime = "nodejs";

const MAX_CV_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const parsed = registrationFields.safeParse({
    eventSlug: form.get("eventSlug"),
    name: form.get("name"),
    email: form.get("email"),
    phone: form.get("phone"),
    extraInfo: form.get("extraInfo") ?? "",
    foodPreference: form.get("foodPreference"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Controleer het formulier.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const event = getEventBySlug(parsed.data.eventSlug);
  if (!event || !isEventAcceptingRegistrations(event)) {
    return NextResponse.json(
      { error: "Dit event is niet (meer) beschikbaar voor inschrijving." },
      { status: 404 },
    );
  }

  const cv = form.get("cv");
  if (!(cv instanceof File) || cv.size === 0) {
    return NextResponse.json({ error: "Upload je CV als PDF." }, { status: 400 });
  }
  if (cv.type !== "application/pdf" && !cv.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Het CV moet een PDF zijn." }, { status: 400 });
  }
  if (cv.size > MAX_CV_BYTES) {
    return NextResponse.json(
      { error: "Het CV mag maximaal 5 MB groot zijn." },
      { status: 413 },
    );
  }

  if (!FOOD_OPTIONS.some((option) => option.value === parsed.data.foodPreference)) {
    return NextResponse.json({ error: "Ongeldige voedselvoorkeur." }, { status: 400 });
  }

  if (getRegistrationByEmail(parsed.data.email, event.id)) {
    return NextResponse.json(
      { error: "Dit e-mailadres is al ingeschreven voor dit event." },
      { status: 409 },
    );
  }

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const ticketToken = mintTicketToken({
    id,
    eventId: event.id,
    eventSlug: event.slug,
    eventName: event.name,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    extraInfo: parsed.data.extraInfo,
    foodPreference: parsed.data.foodPreference,
    cvOriginalName: cv.name,
    createdAt,
  });
  const storedName = `${id}.pdf`;
  const bytes = Buffer.from(await cv.arrayBuffer());
  await fs.writeFile(path.join(getUploadDir(), storedName), bytes);

  const registration = createRegistration({
    id,
    eventId: event.id,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    extraInfo: parsed.data.extraInfo,
    foodPreference: parsed.data.foodPreference,
    cvOriginalName: cv.name,
    cvStoredName: storedName,
    ticketToken,
  });

  let emailSent = false;
  try {
    const result = await sendTicketEmail(registration, {
      date: event.date,
      location: event.location,
    });
    emailSent = result.sent;
  } catch (error) {
    console.error("Ticket e-mail mislukt:", error);
  }

  return NextResponse.json({
    ok: true,
    eventSlug: registration.eventSlug,
    token: registration.ticketToken,
    emailSent,
  });
}
