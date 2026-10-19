import { NextResponse } from "next/server";
import { getCompanyIdBySlug } from "@/lib/auth/repository";
import { databaseConfigured } from "@/lib/db/pool";
import { appendGuestOrder } from "@/lib/pos/server-store";
import type { GuestOrderSubmit } from "@/lib/pos/types";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const companySlug = searchParams.get("company")?.trim();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const input = body as GuestOrderSubmit;
  if (!input.tableId || !Array.isArray(input.lines) || input.lines.length === 0) {
    return NextResponse.json({ error: "tableId and lines required" }, { status: 422 });
  }
  try {
    let companyId: string | undefined;
    if (databaseConfigured()) {
      if (!companySlug) {
        return NextResponse.json({ error: "company query required" }, { status: 422 });
      }
      const id = await getCompanyIdBySlug(companySlug);
      if (!id) return NextResponse.json({ error: "Company not found" }, { status: 404 });
      companyId = id;
    }
    const order = await appendGuestOrder(
      {
        tableId: input.tableId,
        tableLabel: input.tableLabel ?? "Table",
        lines: input.lines,
        note: input.note ?? "",
      },
      companyId,
    );
    return NextResponse.json({ ok: true, orderId: order.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not submit order.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
