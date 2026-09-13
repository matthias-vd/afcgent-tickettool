import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "node:fs/promises";
import path from "node:path";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";
import {
  createEvent,
  deleteEvent,
  getEventById,
  getUploadDir,
  setEventArchived,
  updateEvent,
  type EventInput,
} from "@/lib/db";
import { brusselsLocalToIso } from "@/lib/datetime";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

async function assertAdmin() {
  const jar = await cookies();
  return isValidSession(jar.get(SESSION_COOKIE)?.value);
}

function emptyToNull(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function extensionForImage(file: File) {
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "image/gif") return ".gif";
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpeg") || name.endsWith(".jpg")) return ".jpg";
  if (name.endsWith(".png")) return ".png";
  if (name.endsWith(".webp")) return ".webp";
  if (name.endsWith(".gif")) return ".gif";
  return "";
}

async function saveEventImage(file: File, eventId: string) {
  const extension = extensionForImage(file);
  if (!ALLOWED_IMAGE_TYPES.has(file.type) && !extension) {
    throw new Error("Upload een JPG, PNG, WEBP of GIF.");
  }
  if (!extension) {
    throw new Error("Onbekend afbeeldingsformaat.");
  }
  if (file.size <= 0) {
    throw new Error("De afbeelding is leeg.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("De afbeelding mag maximaal 5 MB zijn.");
  }

  const storedName = `event-${eventId}${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(getUploadDir(), storedName), bytes);
  return storedName;
}

function parseEventInput(form: FormData): EventInput {
  const name = String(form.get("name") ?? "").trim();
  const date = String(form.get("date") ?? "").trim();
  const location = String(form.get("location") ?? "").trim();
  const intro = String(form.get("intro") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
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
    description,
    isOpen: form.get("isOpen") === "1" || form.get("isOpen") === "on",
    archived: form.get("archived") === "1" || form.get("archived") === "on",
    clearImage: form.get("clearImage") === "1" || form.get("clearImage") === "on",
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
    const input = parseEventInput(form);
    let event = createEvent(input);

    const image = form.get("image");
    if (image instanceof File && image.size > 0) {
      const imageStoredName = await saveEventImage(image, event.id);
      event = updateEvent(event.id, {
        ...input,
        imageStoredName,
        clearImage: false,
      });
    }

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

    const input = parseEventInput(form);
    const image = form.get("image");
    if (image instanceof File && image.size > 0) {
      input.imageStoredName = await saveEventImage(image, id);
      input.clearImage = false;
    }

    const event = updateEvent(id, input);
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
