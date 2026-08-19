import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getEvents } from "./config";
import { mapRegistration, type Registration, type RegistrationRow } from "./types";

const globalForDb = globalThis as unknown as { ticketDb?: Database.Database };

type DbEvent = {
  id: string;
  slug: string;
  name: string;
  date: string;
  location: string;
  intro: string;
  is_open: number;
};

function randomId() {
  return crypto.randomUUID();
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
      is_open INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);
}

function registrationsNeedMigration(db: Database.Database) {
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
  const now = new Date().toISOString();
  const upsert = db.prepare(`
    INSERT INTO events (id, slug, name, date, location, intro, is_open, created_at)
    VALUES (@id, @slug, @name, @date, @location, @intro, @is_open, @created_at)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      date = excluded.date,
      location = excluded.location,
      intro = excluded.intro,
      is_open = excluded.is_open
  `);

  for (const event of getEvents()) {
    const existing = db
      .prepare(`SELECT id, created_at FROM events WHERE slug = ?`)
      .get(event.slug) as { id: string; created_at: string } | undefined;
    upsert.run({
      id: existing?.id ?? randomId(),
      slug: event.slug,
      name: event.name,
      date: event.date,
      location: event.location,
      intro: event.intro,
      is_open: event.isOpen ? 1 : 0,
      created_at: existing?.created_at ?? now,
    });
  }
}

function migrateRegistrationsTable(db: Database.Database) {
  if (!registrationsNeedMigration(db)) return;

  const fallbackEvent = db
    .prepare(`SELECT id FROM events ORDER BY created_at ASC LIMIT 1`)
    .get() as { id: string } | undefined;
  if (!fallbackEvent) {
    throw new Error("Geen event beschikbaar om registraties te migreren.");
  }

  db.exec(`
    ALTER TABLE registrations RENAME TO registrations_legacy;
  `);
  createRegistrationsTable(db);
  ensureRegistrationIndexes(db);
  db.prepare(`
    INSERT INTO registrations (
      id, event_id, name, email, phone, extra_info, food_preference,
      cv_original_name, cv_stored_name, ticket_token, checked_in_at, created_at
    )
    SELECT
      id, ?, name, email, phone, extra_info, food_preference,
      cv_original_name, cv_stored_name, ticket_token, checked_in_at, created_at
    FROM registrations_legacy
  `).run(fallbackEvent.id);
  db.exec(`DROP TABLE registrations_legacy;`);
}

function createDb() {
  const dataDir = path.join(process.cwd(), "data");
  const uploadDir = path.join(dataDir, "uploads");
  fs.mkdirSync(uploadDir, { recursive: true });

  const db = new Database(path.join(dataDir, "tickets.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  ensureEventSchema(db);
  ensureEventsSeeded(db);
  if (registrationsNeedMigration(db)) {
    migrateRegistrationsTable(db);
  } else {
    createRegistrationsTable(db);
    ensureRegistrationIndexes(db);
  }
  return db;
}

export const db = globalForDb.ticketDb ?? createDb();
if (process.env.NODE_ENV !== "production") {
  globalForDb.ticketDb = db;
}

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
  const dir = path.join(process.cwd(), "data", "uploads");
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

export function getRegistrationByToken(token: string): Registration | undefined {
  const row = db
    .prepare(`${selectAll} WHERE r.ticket_token = ?`)
    .get(token) as RegistrationRow | undefined;
  return row ? mapRegistration(row) : undefined;
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

export function listEvents() {
  return db.prepare(`SELECT * FROM events ORDER BY date ASC`).all() as DbEvent[];
}

export function getOpenEvents() {
  return db
    .prepare(`SELECT * FROM events WHERE is_open = 1 ORDER BY date ASC`)
    .all() as DbEvent[];
}

export function getEventBySlug(slug: string) {
  return db.prepare(`SELECT * FROM events WHERE slug = ?`).get(slug) as
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
        e.is_open,
        COUNT(r.id) AS total,
        SUM(CASE WHEN r.checked_in_at IS NOT NULL THEN 1 ELSE 0 END) AS present
      FROM events e
      LEFT JOIN registrations r ON r.event_id = e.id
      GROUP BY e.id
      ORDER BY e.date ASC
    `,
    )
    .all() as Array<{
    id: string;
    slug: string;
    name: string;
    date: string;
    is_open: number;
    total: number;
    present: number | null;
  }>;
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
