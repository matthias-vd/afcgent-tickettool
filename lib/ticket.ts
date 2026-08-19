import { getAppUrl } from "./config";

export function ticketUrl(token: string) {
  return `${getAppUrl()}/ticket/${token}`;
}

export function parseTicketPayload(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const prefixed = value.match(/^(?:TICKET|AFC):([A-Za-z0-9_-]+)$/i);
  if (prefixed) return prefixed[1];

  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const ticketIndex = parts.findIndex((part) => part === "ticket" || part === "t");
    if (ticketIndex >= 0 && parts[ticketIndex + 1]) {
      return parts[ticketIndex + 1];
    }
  } catch {
    // Not a URL — fall through to raw token.
  }

  if (/^[A-Za-z0-9_-]{16,}$/.test(value)) return value;
  return null;
}
