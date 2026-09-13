import { getAppUrl } from "./config";
import { isSignedTicketToken } from "./ticket-token";

export function ticketUrl(eventSlug: string, token: string) {
  return `${getAppUrl()}/ticket/${eventSlug}/${encodeURIComponent(token)}`;
}

export function parseTicketPayload(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const prefixed = value.match(/^(?:TICKET|AFC):(.+)$/i);
  if (prefixed) {
    const token = prefixed[1].trim();
    return isSignedTicketToken(token) || /^[A-Za-z0-9_-]{16,}$/.test(token)
      ? token
      : null;
  }

  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const ticketIndex = parts.findIndex((part) => part === "ticket" || part === "t");
    if (ticketIndex >= 0 && parts[ticketIndex + 1]) {
      const token = decodeURIComponent(parts.at(-1) ?? parts[ticketIndex + 1]);
      if (isSignedTicketToken(token) || /^[A-Za-z0-9_-]{16,}$/.test(token)) {
        return token;
      }
    }
  } catch {
    // Not a URL — fall through to raw token.
  }

  const decoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })();

  if (isSignedTicketToken(decoded)) return decoded;
  if (/^[A-Za-z0-9_-]{16,}$/.test(decoded)) return decoded;
  return null;
}
