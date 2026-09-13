import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getEventById, getUploadDir } from "@/lib/db";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event?.image_stored_name) {
    return NextResponse.json({ error: "Geen afbeelding." }, { status: 404 });
  }

  const filePath = path.join(getUploadDir(), event.image_stored_name);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Afbeelding ontbreekt." }, { status: 404 });
  }

  const extension = path.extname(event.image_stored_name).toLowerCase();
  const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";
  const file = fs.readFileSync(filePath);

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
