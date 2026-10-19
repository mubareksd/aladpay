import { NextResponse } from "next/server";
import { appendGuestOrder } from "@/lib/pos/server-store";
import type { GuestOrderSubmit } from "@/lib/pos/types";

export async function POST(request: Request) {
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
  const order = await appendGuestOrder({
    tableId: input.tableId,
    tableLabel: input.tableLabel ?? "Table",
    lines: input.lines,
    note: input.note ?? "",
  });
  return NextResponse.json({ ok: true, orderId: order.id });
}
