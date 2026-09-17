import { createHmac, timingSafeEqual } from "node:crypto";
import type { Registration } from "./types";

type TicketClaims = {
  v: 1;
  id: string;
  eventId: string;
  eventSlug: string;
  eventName: string;
  name: string;
  email: string;
  phone: string;
  extraInfo: string;
  foodPreference: string;
  cvOriginalName: string;
  createdAt: string;
};

function getTicketSecret() {
  return (
    process.env.TICKET_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    "demo-ticket-secret"
  );
}

function sign(body: string) {
  return createHmac("sha256", getTicketSecret()).update(body).digest("base64url");
}

export function isSignedTicketToken(token: string) {
  return /^t1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
}

export function mintTicketToken(
  input: Omit<TicketClaims, "v">,
): string {
  const claims: TicketClaims = { v: 1, ...input };
  const body = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  return `t1.${body}.${sign(body)}`;
}

export function verifyTicketToken(token: string): Registration | null {
  if (!isSignedTicketToken(token)) return null;

  const [, body, signature] = token.split(".");
  const expected = sign(body);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const claims = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as TicketClaims;
    if (claims.v !== 1 || !claims.id || !claims.eventSlug || !claims.email) {
      return null;
    }

    return {
      id: claims.id,
      eventId: claims.eventId,
      eventSlug: claims.eventSlug,
      eventName: claims.eventName,
      name: claims.name,
      email: claims.email,
      phone: claims.phone,
      extraInfo: claims.extraInfo ?? "",
      foodPreference: claims.foodPreference,
      cvOriginalName: claims.cvOriginalName ?? "",
      cvStoredName: `${claims.id}.pdf`,
      ticketToken: token,
      checkedInAt: null,
      cancelledAt: null,
      createdAt: claims.createdAt,
    };
  } catch {
    return null;
  }
}
