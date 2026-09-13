import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";
import {
  createEvent,
  deleteEvent,
  getEventById,
  setEventArchived,
  updateEvent,
  type EventInput,
} from "@/lib/db";
import { brusselsLocalToIso } from "@/lib/datetime";

export const runtime = "nodejs";

async function assertAdmin() {
  const jar = await cookies();
  return isValidSession(jar.get(SESSION_COOKIE)?.value);
}

function emptyToNull(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseEventInput(form: FormData): EventInput {
  const name = String(form.get("name") ?? "").trim();
  const date = String(form.get("date") ?? "").trim();
  const location = String(form.get("location") ?? "").trim();
  const intro = String(form.get("intro") ?? "").trim();
  const slug = emptyToNull(form.get("slug")) ?? undefined;

  if (!name || name.length < 2) {
    throw new Error("Vul een eventnaam in.");
  }
  if (!date) {
    throw new Error("Vul de eventdatum in.");
  }
  if (!location) {
    throw new Error("Vul een locatie in.");
  }
  if (!intro) {
    throw new Error("Vul een korte intro in.");
  }

  const dateIso = brusselsLocalToIso(date);
  if (!dateIso) {
    throw new Error("Vul de eventdatum in.");
  }

  return {
    name,
    slug,
    date: dateIso,
    location,
    intro,
    isOpen: form.get("isOpen") === "1" || form.get("isOpen") === "on",
    archived: form.get("archived") === "1" || form.get("archived") === "on",
    registrationOpensAt: brusselsLocalToIso(
      emptyToNull(form.get("registrationOpensAt")),
    ),
    registrationClosesAt: brusselsLocalToIso(
      emptyToNull(form.get("registrationClosesAt")),
    ),
  };
}

export async function POST(request: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const event = createEvent(parseEventInput(form));
    return NextResponse.json({ ok: true, event });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Event aanmaken mislukt.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const id = String(form.get("id") ?? "").trim();
    if (!id || !getEventById(id)) {
      return NextResponse.json({ error: "Event niet gevonden." }, { status: 404 });
    }
    const event = updateEvent(id, parseEventInput(form));
    return NextResponse.json({ ok: true, event });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Event bijwerken mislukt.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      archived?: boolean;
    };
    if (!body.id?.trim()) {
      return NextResponse.json({ error: "Geen event opgegeven." }, { status: 400 });
    }
    if (typeof body.archived !== "boolean") {
      return NextResponse.json(
        { error: "Archiefstatus ontbreekt." },
        { status: 400 },
      );
    }
    const event = setEventArchived(body.id.trim(), body.archived);
    return NextResponse.json({ ok: true, event });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Archiveren mislukt.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id?.trim()) {
      return NextResponse.json({ error: "Geen event opgegeven." }, { status: 400 });
    }
    const event = deleteEvent(body.id.trim());
    return NextResponse.json({ ok: true, event });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Verwijderen mislukt.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
