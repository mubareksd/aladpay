import { NextResponse } from "next/server";
import type { AladCheckoutWebhookBody } from "@/lib/alad/types";

/** Acknowledge Alad checkout webhooks (callback_url). Fulfillment is app-specific. */
export async function POST(request: Request) {
  let body: AladCheckoutWebhookBody;
  try {
    body = (await request.json()) as AladCheckoutWebhookBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[alad checkout webhook]", body.status, body.order_id);
  }

  return NextResponse.json({ ok: true, received: body.status ?? "unknown" });
}
