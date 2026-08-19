import { getAdminPassword } from "./config";

export const SESSION_COOKIE = "gate_session";

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(password = getAdminPassword()) {
  return sha256Hex(`gate:${password}`);
}

export async function isValidSession(value?: string | null) {
  if (!value) return false;
  const expected = await createSessionToken();
  if (value.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < value.length; i += 1) {
    mismatch |= value.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
