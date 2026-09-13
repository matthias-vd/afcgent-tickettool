import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";
import {
  createRegistration,
  deleteRegistration,
  getEventBySlug,
  getRegistrationByEmail,
  getUploadDir,
} from "@/lib/db";
import { sendTicketEmail } from "@/lib/email";
import { FOOD_OPTIONS } from "@/lib/food";
import { mintTicketToken } from "@/lib/ticket-token";
import { registrationFields } from "@/lib/validation";

export const runtime = "nodejs";

const MAX_CV_BYTES = 5 * 1024 * 1024;

async function assertAdmin() {
  const jar = await cookies();
  return isValidSession(jar.get(SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

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
  if (!event) {
    return NextResponse.json({ error: "Onbekend event." }, { status: 404 });
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
  let cvOriginalName = "";
  let cvStoredName = "";

  const cv = form.get("cv");
  if (cv instanceof File && cv.size > 0) {
    if (cv.type !== "application/pdf" && !cv.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Het CV moet een PDF zijn." }, { status: 400 });
    }
    if (cv.size > MAX_CV_BYTES) {
      return NextResponse.json(
        { error: "Het CV mag maximaal 5 MB groot zijn." },
        { status: 413 },
      );
    }

    cvOriginalName = cv.name;
    cvStoredName = `${id}.pdf`;
    const bytes = Buffer.from(await cv.arrayBuffer());
    await fs.writeFile(path.join(getUploadDir(), cvStoredName), bytes);
  }

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
    cvOriginalName,
    createdAt,
  });

  const registration = createRegistration({
    id,
    eventId: event.id,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    extraInfo: parsed.data.extraInfo,
    foodPreference: parsed.data.foodPreference,
    cvOriginalName,
    cvStoredName,
    ticketToken,
  });

  let emailSent = false;
  if (form.get("sendEmail") === "1") {
    try {
      const result = await sendTicketEmail(registration, {
        date: event.date,
        location: event.location,
      });
      emailSent = result.sent;
    } catch (error) {
      console.error("Ticket e-mail mislukt:", error);
    }
  }

  return NextResponse.json({
    ok: true,
    registration,
    emailSent,
    ticketPath: `/ticket/${registration.eventSlug}/${encodeURIComponent(registration.ticketToken)}`,
  });
}

export async function DELETE(request: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const body = (await request.json()) as { id?: string };
  if (!body.id?.trim()) {
    return NextResponse.json({ error: "Geen deelnemer opgegeven." }, { status: 400 });
  }

  const deleted = deleteRegistration(body.id.trim());
  if (!deleted) {
    return NextResponse.json({ error: "Deelnemer niet gevonden." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: deleted.id });
}
