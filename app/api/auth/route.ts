import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSessionToken,
  isValidSession,
  SESSION_COOKIE,
} from "@/lib/auth";
import { getAdminPassword, getAppUrl } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { password?: string };
  if (body.password !== getAdminPassword()) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: getAppUrl().startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  if (!(await isValidSession(jar.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ ok: true });
  }
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
