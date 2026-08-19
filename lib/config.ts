export type EventDefinition = {
  slug: string;
  name: string;
  date: string;
  location: string;
  intro: string;
  isOpen: boolean;
};

const fallbackEvents: EventDefinition[] = [
  {
    slug: "afc-avond",
    name: "AFC Avond",
    date: "2026-09-12T18:00",
    location: "Campus, lokaal 1.01",
    intro:
      "Schrijf je in voor de avond. Na inschrijving ontvang je een ticket met QR-code. Toon die code aan de ingang.",
    isOpen: true,
  },
  {
    slug: "afc-workshop",
    name: "AFC Workshop",
    date: "2026-10-03T13:30",
    location: "Campus, lokaal 2.05",
    intro:
      "Praktische workshop met beperkte plaatsen. Schrijf je in en toon je QR-code bij aankomst.",
    isOpen: true,
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseEventsJson(raw: string): EventDefinition[] | null {
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return null;

    const normalized = data
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const item = row as Record<string, unknown>;
        const name = String(item.name ?? "").trim();
        const date = String(item.date ?? "").trim();
        const location = String(item.location ?? "").trim();
        const intro = String(item.intro ?? "").trim();
        const isOpen =
          typeof item.isOpen === "boolean"
            ? item.isOpen
            : typeof item.open === "boolean"
              ? item.open
              : true;
        const slugSource = String(item.slug ?? name).trim();
        const slug = slugify(slugSource);

        if (!name || !date || !location || !intro || !slug) return null;
        return { slug, name, date, location, intro, isOpen } satisfies EventDefinition;
      })
      .filter((item): item is EventDefinition => Boolean(item));

    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}

function legacySingleEvent(): EventDefinition {
  const name = process.env.EVENT_NAME?.trim() || "AFC Avond";
  return {
    slug: slugify(name) || "event",
    name,
    date: process.env.EVENT_DATE?.trim() || "2026-09-12T18:00",
    location: process.env.EVENT_LOCATION?.trim() || "Campus, lokaal 1.01",
    intro:
      process.env.EVENT_INTRO?.trim() ||
      "Schrijf je in voor de avond. Na inschrijving ontvang je een ticket met QR-code. Toon die code aan de ingang.",
    isOpen: true,
  };
}

export function getEvents(): EventDefinition[] {
  const fromJson = process.env.EVENTS_JSON?.trim();
  if (fromJson) {
    const parsed = parseEventsJson(fromJson);
    if (parsed) return parsed;
  }

  if (
    process.env.EVENT_NAME ||
    process.env.EVENT_DATE ||
    process.env.EVENT_LOCATION ||
    process.env.EVENT_INTRO
  ) {
    return [legacySingleEvent()];
  }

  return fallbackEvents;
}

export function getEvent() {
  return getEvents()[0];
}

export function getOpenEvents() {
  return getEvents().filter((event) => event.isOpen);
}

export function getEventBySlug(slug: string) {
  return getEvents().find((event) => event.slug === slug) ?? null;
}

export function getAppUrl(): string {
  return (process.env.APP_URL?.trim() || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || "admin123";
}
