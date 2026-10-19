import { NextResponse } from "next/server";
import { publishGuestMenu } from "@/lib/pos/server-store";
import type { PublishedGuestMenu } from "@/lib/pos/types";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const input = body as Partial<PublishedGuestMenu>;
  if (!Array.isArray(input.tables) || !Array.isArray(input.menuItems)) {
    return NextResponse.json({ error: "tables and menuItems required" }, { status: 422 });
  }
  const published = await publishGuestMenu({
    updatedAt: Date.now(),
    venueName: String(input.venueName ?? "Restaurant"),
    tables: input.tables,
    menuItems: input.menuItems,
  });
  return NextResponse.json({ ok: true, published });
}
