import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { mapRegistration, type Registration, type RegistrationRow } from "./types";

const globalForDb = globalThis as unknown as { ticketDb?: Database.Database };

function createDb() {
  const dataDir = path.join(process.cwd(), "data");
  const uploadDir = path.join(dataDir, "uploads");
  fs.mkdirSync(uploadDir, { recursive: true });

  const db = new Database(path.join(dataDir, "tickets.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      phone TEXT NOT NULL,
      extra_info TEXT NOT NULL DEFAULT '',
      food_preference TEXT NOT NULL,
      cv_original_name TEXT NOT NULL,
      cv_stored_name TEXT NOT NULL,
      ticket_token TEXT NOT NULL UNIQUE,
      checked_in_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_registrations_checked_in
      ON registrations(checked_in_at);
    CREATE INDEX IF NOT EXISTS idx_registrations_created
      ON registrations(created_at);
  `);
  return db;
}

export const db = globalForDb.ticketDb ?? createDb();
if (process.env.NODE_ENV !== "production") {
  globalForDb.ticketDb = db;
}

const selectAll = `
  SELECT id, name, email, phone, extra_info, food_preference,
         cv_original_name, cv_stored_name, ticket_token, checked_in_at, created_at
  FROM registrations
`;

export function getUploadDir() {
  const dir = path.join(process.cwd(), "data", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function createRegistration(
  input: Omit<Registration, "checkedInAt" | "createdAt">,
): Registration {
  const createdAt = new Date().toISOString();
  db.prepare(
    `
    INSERT INTO registrations (
      id, name, email, phone, extra_info, food_preference,
      cv_original_name, cv_stored_name, ticket_token, checked_in_at, created_at
    ) VALUES (
      @id, @name, @email, @phone, @extraInfo, @foodPreference,
      @cvOriginalName, @cvStoredName, @ticketToken, NULL, @createdAt
    )
  `,
  ).run({ ...input, createdAt });

  return { ...input, checkedInAt: null, createdAt };
}

export function getRegistrationByEmail(email: string): Registration | undefined {
  const row = db
    .prepare(`${selectAll} WHERE email = ? COLLATE NOCASE`)
    .get(email) as RegistrationRow | undefined;
  return row ? mapRegistration(row) : undefined;
}

export function getRegistrationByToken(token: string): Registration | undefined {
  const row = db
    .prepare(`${selectAll} WHERE ticket_token = ?`)
    .get(token) as RegistrationRow | undefined;
  return row ? mapRegistration(row) : undefined;
}

export function getRegistrationById(id: string): Registration | undefined {
  const row = db
    .prepare(`${selectAll} WHERE id = ?`)
    .get(id) as RegistrationRow | undefined;
  return row ? mapRegistration(row) : undefined;
}

export function listRegistrations(): Registration[] {
  const rows = db
    .prepare(`${selectAll} ORDER BY created_at DESC`)
    .all() as RegistrationRow[];
  return rows.map(mapRegistration);
}

export function getStats() {
  const row = db
    .prepare(
      `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN checked_in_at IS NOT NULL THEN 1 ELSE 0 END) AS present
      FROM registrations
    `,
    )
    .get() as { total: number; present: number | null };

  const total = row.total ?? 0;
  const present = row.present ?? 0;
  return {
    total,
    present,
    absent: total - present,
  };
}

export function checkInRegistration(lookup: {
  token?: string;
  id?: string;
  email?: string;
}): { registration: Registration; alreadyCheckedIn: boolean } | null {
  const registration = lookup.token
    ? getRegistrationByToken(lookup.token)
    : lookup.id
      ? getRegistrationById(lookup.id)
      : lookup.email
        ? getRegistrationByEmail(lookup.email)
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
