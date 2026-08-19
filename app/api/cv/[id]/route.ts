import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "node:fs";
import path from "node:path";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";
import { getRegistrationById, getUploadDir } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const jar = await cookies();
  if (!(await isValidSession(jar.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const { id } = await params;
  const registration = getRegistrationById(id);
  if (!registration) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  const filePath = path.join(getUploadDir(), registration.cvStoredName);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "CV-bestand ontbreekt." }, { status: 404 });
  }

  const file = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${registration.cvOriginalName.replace(/"/g, "")}"`,
    },
  });
}
