import { NextResponse } from "next/server";
import { requirePosAccess } from "@/lib/auth/guard";
import { publishGuestMenu } from "@/lib/pos/server-store";
import type { PublishedGuestMenu } from "@/lib/pos/types";

export async function POST(request: Request) {
  const gate = await requirePosAccess();
  if (gate instanceof NextResponse) return gate;
  const companyId = gate?.activeCompany?.id;
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
  try {
    const published = await publishGuestMenu(
      {
        updatedAt: Date.now(),
        venueName: String(input.venueName ?? gate?.activeCompany?.name ?? "Restaurant"),
        tables: input.tables,
        menuItems: input.menuItems,
      },
      companyId,
    );
    return NextResponse.json({ ok: true, published });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Publish failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
