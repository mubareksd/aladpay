import { NextResponse } from "next/server";
import { requirePosAccess } from "@/lib/auth/guard";
import { acknowledgeGuestOrders, listPendingGuestOrders } from "@/lib/pos/server-store";

export async function GET() {
  const gate = await requirePosAccess();
  if (gate instanceof NextResponse) return gate;
  const orders = await listPendingGuestOrders(gate?.activeCompany?.id);
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const gate = await requirePosAccess();
  if (gate instanceof NextResponse) return gate;
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
  const count = await acknowledgeGuestOrders(gate?.activeCompany?.id, ids);
  return NextResponse.json({ ok: true, acknowledged: count });
}
