import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";
import { registrationsToCsv } from "@/lib/csv";
import { listRegistrations } from "@/lib/db";
import { getEvent } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  if (!(await isValidSession(jar.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const csv = registrationsToCsv(listRegistrations());
  const slug = getEvent()
    .name.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug || "inschrijvingen"}-aanwezigheid.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
