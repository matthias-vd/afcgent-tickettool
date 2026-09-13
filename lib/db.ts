import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getEvents } from "./config";
import { verifyTicketToken } from "./ticket-token";
import { mapRegistration, type Registration, type RegistrationRow } from "./types";

const globalForDb = globalThis as unknown as { ticketDb?: Database.Database };

export type DbEvent = {
  id: string;
  slug: string;
  name: string;
  date: string;
  location: string;
  intro: string;
  description: string;
  image_stored_name: string | null;
  is_open: number;
  archived: number;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  created_at: string;
};

function randomId() {
  return crypto.randomUUID();
}

function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  definition: string,
) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function ensureEventSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      location TEXT NOT NULL,
      intro TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image_stored_name TEXT,
      is_open INTEGER NOT NULL DEFAULT 1,
      archived INTEGER NOT NULL DEFAULT 0,
      registration_opens_at TEXT,
      registration_closes_at TEXT,
      created_at TEXT NOT NULL
    );
  `);
  ensureColumn(db, "events", "archived", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "events", "registration_opens_at", "TEXT");
  ensureColumn(db, "events", "registration_closes_at", "TEXT");
  ensureColumn(db, "events", "description", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "events", "image_stored_name", "TEXT");
}

function tableExists(db: Database.Database, name: string) {
  const row = db
    .prepare(
      `SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?`,
    )
    .get(name) as { ok: number } | undefined;
  return Boolean(row);
}

function registrationsNeedMigration(db: Database.Database) {
  if (!tableExists(db, "registrations")) return false;
  const columns = db
    .prepare(`PRAGMA table_info(registrations)`)
    .all() as Array<{ name: string }>;
  return columns.length > 0 && !columns.some((column) => column.name === "event_id");
}

function createRegistrationsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE,
      phone TEXT NOT NULL,
      extra_info TEXT NOT NULL DEFAULT '',
      food_preference TEXT NOT NULL,
      cv_original_name TEXT NOT NULL,
      cv_stored_name TEXT NOT NULL,
      ticket_token TEXT NOT NULL UNIQUE,
      checked_in_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(event_id, email)
    );
  `);
}

function ensureRegistrationIndexes(db: Database.Database) {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);
    CREATE INDEX IF NOT EXISTS idx_registrations_checked_in ON registrations(checked_in_at);
    CREATE INDEX IF NOT EXISTS idx_registrations_created ON registrations(created_at);
  `);
}

function ensureEventsSeeded(db: Database.Database) {
  const count = (
    db.prepare(`SELECT COUNT(*) AS count FROM events`).get() as { count: number }
  ).count;
  if (count > 0) return;

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO events (
      id, slug, name, date, location, intro, is_open, archived,
      registration_opens_at, registration_closes_at, created_at
    ) VALUES (
      @id, @slug, @name, @date, @location, @intro, @is_open, 0,
      NULL, NULL, @created_at
    )
  `);

  for (const event of getEvents()) {
    insert.run({
      id: randomId(),
      slug: event.slug,
      name: event.name,
      date: event.date,
      location: event.location,
      intro: event.intro,
      is_open: event.isOpen ? 1 : 0,
      created_at: now,
    });
  }
}

function migrateRegistrationsTable(db: Database.Database) {
  const hasLegacy = tableExists(db, "registrations_legacy");
  const needsMigration = registrationsNeedMigration(db);
  const hasNewRegistrations =
    tableExists(db, "registrations") && !needsMigration;

  // Already on the new schema: only clean up a leftover legacy table.
  if (hasNewRegistrations) {
    if (hasLegacy) {
      db.exec(`DROP TABLE IF EXISTS registrations_legacy;`);
    }
    return;
  }

  // Nothing to migrate.
  if (!needsMigration && !hasLegacy) return;

  const fallbackEvent = db
    .prepare(`SELECT id FROM events ORDER BY created_at ASC LIMIT 1`)
    .get() as { id: string } | undefined;
  if (!fallbackEvent) {
    throw new Error("Geen event beschikbaar om registraties te migreren.");
  }

  const migrate = db.transaction(() => {
    // Case A: old registrations still present.
    // Case B: previous run renamed to registrations_legacy and crashed.
    if (needsMigration) {
      if (hasLegacy) {
        // Stale leftover name conflict — keep the current old-schema table.
        db.exec(`DROP TABLE registrations_legacy;`);
      }
      db.exec(`ALTER TABLE registrations RENAME TO registrations_legacy;`);
    }

    createRegistrationsTable(db);
    ensureRegistrationIndexes(db);

    if (tableExists(db, "registrations_legacy")) {
      const legacyColumns = db
        .prepare(`PRAGMA table_info(registrations_legacy)`)
        .all() as Array<{ name: string }>;
      if (legacyColumns.length > 0) {
        db.prepare(`
          INSERT OR IGNORE INTO registrations (
            id, event_id, name, email, phone, extra_info, food_preference,
            cv_original_name, cv_stored_name, ticket_token, checked_in_at, created_at
          )
          SELECT
            id, ?, name, email, phone, extra_info, food_preference,
            cv_original_name, cv_stored_name, ticket_token, checked_in_at, created_at
          FROM registrations_legacy
        `).run(fallbackEvent.id);
      }
      db.exec(`DROP TABLE IF EXISTS registrations_legacy;`);
    }
  });

  migrate();
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

/** Local disk for demos; on Vercel the app filesystem is read-only, so use /tmp. */
function getDataDir() {
  if (isVercelRuntime()) {
    return path.join("/tmp", "ticketing-data");
  }
  return path.join(process.cwd(), "data");
}

function createDb() {
  const dataDir = getDataDir();
  const uploadDir = path.join(dataDir, "uploads");
  fs.mkdirSync(uploadDir, { recursive: true });

  const db = new Database(path.join(dataDir, "tickets.db"));
  // WAL needs extra writable sidecar files; DELETE is safer on serverless /tmp.
  db.pragma(`journal_mode = ${isVercelRuntime() ? "DELETE" : "WAL"}`);
  db.pragma("foreign_keys = ON");
  ensureEventSchema(db);
  ensureEventsSeeded(db);
  // Always run: also repairs a leftover registrations_legacy from a failed deploy.
  migrateRegistrationsTable(db);
  createRegistrationsTable(db);
  ensureRegistrationIndexes(db);
  return db;
}

export const db = globalForDb.ticketDb ?? createDb();
// Reuse the connection across warm serverless invocations too.
globalForDb.ticketDb = db;

const selectAll = `
  SELECT
         r.id,
         r.event_id,
         e.slug AS event_slug,
         e.name AS event_name,
         r.name,
         r.email,
         r.phone,
         r.extra_info,
         r.food_preference,
         r.cv_original_name,
         r.cv_stored_name,
         r.ticket_token,
         r.checked_in_at,
         r.created_at
  FROM registrations r
  INNER JOIN events e ON e.id = r.event_id
`;

export function getUploadDir() {
  const dir = path.join(getDataDir(), "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function createRegistration(
  input: Omit<
    Registration,
    "checkedInAt" | "createdAt" | "eventSlug" | "eventName"
  >,
): Registration {
  const createdAt = new Date().toISOString();
  db.prepare(
    `
    INSERT INTO registrations (
      id, event_id, name, email, phone, extra_info, food_preference,
      cv_original_name, cv_stored_name, ticket_token, checked_in_at, created_at
    ) VALUES (
      @id, @eventId, @name, @email, @phone, @extraInfo, @foodPreference,
      @cvOriginalName, @cvStoredName, @ticketToken, NULL, @createdAt
    )
  `,
  ).run({ ...input, createdAt });

  const saved = getRegistrationById(input.id);
  if (!saved) {
    throw new Error("Registratie kon niet worden opgeslagen.");
  }
  return saved;
}

export function getRegistrationByEmail(
  email: string,
  eventId?: string,
): Registration | undefined {
  const where = eventId
    ? `${selectAll} WHERE r.email = ? COLLATE NOCASE AND r.event_id = ?`
    : `${selectAll} WHERE r.email = ? COLLATE NOCASE`;
  const row = db
    .prepare(where)
    .get(...(eventId ? [email, eventId] : [email])) as RegistrationRow | undefined;
  return row ? mapRegistration(row) : undefined;
}

function upsertResolvedRegistration(registration: Registration): Registration {
  const event = getEventBySlug(registration.eventSlug);
  if (!event) return registration;

  const normalized: Registration = {
    ...registration,
    eventId: event.id,
    eventName: event.name,
  };

  const existingById = getRegistrationById(normalized.id);
  if (existingById) return existingById;

  const existingByToken = db
    .prepare(`${selectAll} WHERE r.ticket_token = ?`)
    .get(normalized.ticketToken) as RegistrationRow | undefined;
  if (existingByToken) return mapRegistration(existingByToken);

  try {
    return createRegistration({
      id: normalized.id,
      eventId: normalized.eventId,
      name: normalized.name,
      email: normalized.email,
      phone: normalized.phone,
      extraInfo: normalized.extraInfo,
      foodPreference: normalized.foodPreference,
      cvOriginalName: normalized.cvOriginalName,
      cvStoredName: normalized.cvStoredName,
      ticketToken: normalized.ticketToken,
    });
  } catch {
    return (
      getRegistrationById(normalized.id) ??
      (() => {
        const row = db
          .prepare(`${selectAll} WHERE r.ticket_token = ?`)
          .get(normalized.ticketToken) as RegistrationRow | undefined;
        return row ? mapRegistration(row) : normalized;
      })()
    );
  }
}

export function getRegistrationByToken(token: string): Registration | undefined {
  const row = db
    .prepare(`${selectAll} WHERE r.ticket_token = ?`)
    .get(token) as RegistrationRow | undefined;
  if (row) return mapRegistration(row);

  // On Vercel each serverless instance has its own /tmp SQLite. Signed tickets
  // remain valid across instances even when the local DB does not have the row.
  const signed = verifyTicketToken(token);
  if (!signed) return undefined;
  return upsertResolvedRegistration(signed);
}

export function getRegistrationById(id: string): Registration | undefined {
  const row = db
    .prepare(`${selectAll} WHERE r.id = ?`)
    .get(id) as RegistrationRow | undefined;
  return row ? mapRegistration(row) : undefined;
}

export function listRegistrations(eventId?: string): Registration[] {
  const query = eventId
    ? `${selectAll} WHERE r.event_id = ? ORDER BY r.created_at DESC`
    : `${selectAll} ORDER BY r.created_at DESC`;
  const rows = db.prepare(query).all(...(eventId ? [eventId] : [])) as RegistrationRow[];
  return rows.map(mapRegistration);
}

export function getStats(eventId?: string) {
  const query = eventId
    ? `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN checked_in_at IS NOT NULL THEN 1 ELSE 0 END) AS present
      FROM registrations
      WHERE event_id = ?
    `
    : `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN checked_in_at IS NOT NULL THEN 1 ELSE 0 END) AS present
      FROM registrations
    `;
  const row = db
    .prepare(query)
    .get(...(eventId ? [eventId] : [])) as { total: number; present: number | null };

  const total = row.total ?? 0;
  const present = row.present ?? 0;
  return {
    total,
    present,
    absent: total - present,
  };
}

export function slugifyEventName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isEventAcceptingRegistrations(
  event: DbEvent,
  now = new Date(),
): boolean {
  if (event.archived) return false;
  if (!event.is_open) return false;
  if (event.registration_opens_at) {
    const opens = new Date(event.registration_opens_at);
    if (!Number.isNaN(opens.getTime()) && now < opens) return false;
  }
  if (event.registration_closes_at) {
    const closes = new Date(event.registration_closes_at);
    if (!Number.isNaN(closes.getTime()) && now > closes) return false;
  }
  return true;
}

export function listEvents() {
  return db
    .prepare(`SELECT * FROM events ORDER BY date ASC`)
    .all() as DbEvent[];
}

export function getOpenEvents(now = new Date()) {
  const events = db
    .prepare(
      `
      SELECT * FROM events
      WHERE archived = 0 AND is_open = 1
      ORDER BY date ASC
    `,
    )
    .all() as DbEvent[];
  return events.filter((event) => isEventAcceptingRegistrations(event, now));
}

export function getArchivedEvents() {
  return db
    .prepare(
      `
      SELECT * FROM events
      WHERE archived = 1
      ORDER BY date DESC
    `,
    )
    .all() as DbEvent[];
}

export function getEventBySlug(slug: string) {
  return db.prepare(`SELECT * FROM events WHERE slug = ?`).get(slug) as
    | DbEvent
    | undefined;
}

export function getEventById(id: string) {
  return db.prepare(`SELECT * FROM events WHERE id = ?`).get(id) as
    | DbEvent
    | undefined;
}

export function getEventStats() {
  return db
    .prepare(
      `
      SELECT
        e.id,
        e.slug,
        e.name,
        e.date,
        e.location,
        e.intro,
        e.is_open,
        e.archived,
        e.registration_opens_at,
        e.registration_closes_at,
        e.created_at,
        COUNT(r.id) AS total,
        SUM(CASE WHEN r.checked_in_at IS NOT NULL THEN 1 ELSE 0 END) AS present
      FROM events e
      LEFT JOIN registrations r ON r.event_id = e.id
      GROUP BY e.id
      ORDER BY e.date ASC
    `,
    )
    .all() as Array<
    DbEvent & {
      total: number;
      present: number | null;
    }
  >;
}

export type EventInput = {
  name: string;
  slug?: string;
  date: string;
  location: string;
  intro: string;
  description?: string;
  imageStoredName?: string | null;
  clearImage?: boolean;
  isOpen?: boolean;
  archived?: boolean;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
};

function normalizeOptionalDate(value: string | null | undefined) {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Ongeldige datum.");
  }
  return parsed.toISOString();
}

export function createEvent(input: EventInput): DbEvent {
  const slug = slugifyEventName(input.slug?.trim() || input.name);
  if (!slug) throw new Error("Slug ontbreekt.");
  if (getEventBySlug(slug)) {
    throw new Error("Deze slug bestaat al.");
  }

  const id = randomId();
  const createdAt = new Date().toISOString();
  db.prepare(
    `
    INSERT INTO events (
      id, slug, name, date, location, intro, description, image_stored_name,
      is_open, archived, registration_opens_at, registration_closes_at, created_at
    ) VALUES (
      @id, @slug, @name, @date, @location, @intro, @description, @image_stored_name,
      @is_open, @archived, @registration_opens_at, @registration_closes_at, @created_at
    )
  `,
  ).run({
    id,
    slug,
    name: input.name.trim(),
    date: input.date.trim(),
    location: input.location.trim(),
    intro: input.intro.trim(),
    description: (input.description ?? "").trim(),
    image_stored_name: input.imageStoredName?.trim() || null,
    is_open: input.isOpen === false ? 0 : 1,
    archived: input.archived ? 1 : 0,
    registration_opens_at: normalizeOptionalDate(input.registrationOpensAt),
    registration_closes_at: normalizeOptionalDate(input.registrationClosesAt),
    created_at: createdAt,
  });

  const created = getEventById(id);
  if (!created) throw new Error("Event kon niet worden aangemaakt.");
  return created;
}

export function updateEvent(id: string, input: EventInput): DbEvent {
  const existing = getEventById(id);
  if (!existing) throw new Error("Event niet gevonden.");

  const slug = slugifyEventName(input.slug?.trim() || input.name);
  if (!slug) throw new Error("Slug ontbreekt.");
  const conflict = getEventBySlug(slug);
  if (conflict && conflict.id !== id) {
    throw new Error("Deze slug bestaat al.");
  }

  const nextImageName = input.clearImage
    ? null
    : input.imageStoredName === undefined
      ? existing.image_stored_name
      : input.imageStoredName?.trim() || null;

  db.prepare(
    `
    UPDATE events SET
      slug = @slug,
      name = @name,
      date = @date,
      location = @location,
      intro = @intro,
      description = @description,
      image_stored_name = @image_stored_name,
      is_open = @is_open,
      archived = @archived,
      registration_opens_at = @registration_opens_at,
      registration_closes_at = @registration_closes_at
    WHERE id = @id
  `,
  ).run({
    id,
    slug,
    name: input.name.trim(),
    date: input.date.trim(),
    location: input.location.trim(),
    intro: input.intro.trim(),
    description: (input.description ?? "").trim(),
    image_stored_name: nextImageName,
    is_open: input.isOpen === false ? 0 : 1,
    archived: input.archived ? 1 : 0,
    registration_opens_at: normalizeOptionalDate(input.registrationOpensAt),
    registration_closes_at: normalizeOptionalDate(input.registrationClosesAt),
  });

  if (
    existing.image_stored_name &&
    existing.image_stored_name !== nextImageName
  ) {
    const oldPath = path.join(getUploadDir(), existing.image_stored_name);
    try {
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    } catch {
      // Best-effort cleanup of replaced event image.
    }
  }

  const updated = getEventById(id);
  if (!updated) throw new Error("Event kon niet worden bijgewerkt.");
  return updated;
}

export function setEventArchived(id: string, archived: boolean): DbEvent {
  const existing = getEventById(id);
  if (!existing) throw new Error("Event niet gevonden.");
  db.prepare(`UPDATE events SET archived = ? WHERE id = ?`).run(
    archived ? 1 : 0,
    id,
  );
  const updated = getEventById(id);
  if (!updated) throw new Error("Event kon niet worden bijgewerkt.");
  return updated;
}

export function deleteEvent(id: string): DbEvent {
  const existing = getEventById(id);
  if (!existing) throw new Error("Event niet gevonden.");

  const registrations = listRegistrations(id);
  const deleteReg = db.prepare(`DELETE FROM registrations WHERE id = ?`);
  const removeEvent = db.prepare(`DELETE FROM events WHERE id = ?`);

  const tx = db.transaction(() => {
    for (const registration of registrations) {
      deleteReg.run(registration.id);
    }
    removeEvent.run(id);
  });
  tx();

  for (const registration of registrations) {
    if (!registration.cvStoredName) continue;
    const filePath = path.join(getUploadDir(), registration.cvStoredName);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Best-effort cleanup of uploaded CVs.
    }
  }

  if (existing.image_stored_name) {
    const imagePath = path.join(getUploadDir(), existing.image_stored_name);
    try {
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    } catch {
      // Best-effort cleanup of event image.
    }
  }

  return existing;
}

export function checkInRegistration(lookup: {
  token?: string;
  id?: string;
  email?: string;
  eventId?: string;
}):
  | { registration: Registration; alreadyCheckedIn: boolean }
  | { ambiguous: true; matches: Registration[] }
  | null {
  if (lookup.email) {
    const rows = listRegistrations(lookup.eventId).filter(
      (row) => row.email.toLowerCase() === lookup.email?.toLowerCase(),
    );
    if (rows.length > 1) {
      return { ambiguous: true, matches: rows };
    }
  }

  const registration = lookup.token
    ? getRegistrationByToken(lookup.token)
    : lookup.id
      ? getRegistrationById(lookup.id)
      : lookup.email
        ? getRegistrationByEmail(lookup.email, lookup.eventId)
        : undefined;

  if (!registration) return null;
  if (registration.checkedInAt) {
    return { registration, alreadyCheckedIn: true };
  }

  const checkedInAt = new Date().toISOString();
  db.prepare(`UPDATE registrations SET checked_in_at = ? WHERE id = ?`).run(
    checkedInAt,
    registration.id,
  );

  return {
    registration: { ...registration, checkedInAt },
    alreadyCheckedIn: false,
  };
}

export function undoCheckIn(id: string): Registration | undefined {
  db.prepare(`UPDATE registrations SET checked_in_at = NULL WHERE id = ?`).run(id);
  return getRegistrationById(id);
}

export function deleteRegistration(id: string): Registration | undefined {
  const registration = getRegistrationById(id);
  if (!registration) return undefined;

  db.prepare(`DELETE FROM registrations WHERE id = ?`).run(id);

  if (registration.cvStoredName) {
    const filePath = path.join(getUploadDir(), registration.cvStoredName);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Best-effort cleanup of the uploaded CV.
    }
  }

  return registration;
}
