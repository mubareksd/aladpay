import { NextResponse } from "next/server";
import { acknowledgeGuestOrders, listPendingGuestOrders } from "@/lib/pos/server-store";

export async function GET() {
  const orders = await listPendingGuestOrders();
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const ids = (body as { ids?: unknown }).ids;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "ids array required" }, { status: 422 });
  }
  const count = await acknowledgeGuestOrders(ids);
  return NextResponse.json({ ok: true, acknowledged: count });
}
