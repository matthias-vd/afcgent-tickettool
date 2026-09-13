import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";
import { registrationsToCsv } from "@/lib/csv";
import { getEventBySlug, listRegistrations } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const jar = await cookies();
  if (!(await isValidSession(jar.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const url = new URL(request.url);
  const eventSlug = url.searchParams.get("event")?.trim() || null;
  const event = eventSlug ? getEventBySlug(eventSlug) : null;
  if (eventSlug && !event) {
    return NextResponse.json({ error: "Onbekend event." }, { status: 404 });
  }
  const csv = registrationsToCsv(listRegistrations(event?.id));
  const slug = event?.slug ?? "alle-events";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-aanwezigheid.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
