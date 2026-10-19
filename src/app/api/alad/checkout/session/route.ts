import { NextResponse } from "next/server";
import {
  AladCheckoutValidationError,
  parseCheckoutRequestBody,
} from "@/lib/alad/checkout-request";
import { AladConfigError, aladPostJson, isAladConfigured } from "@/lib/alad/server";

export async function POST(request: Request) {
  if (!isAladConfigured()) {
    return NextResponse.json(
      {
        error: true,
        success: false,
        msg: "Checkout is not available.",
      },
      { status: 503 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: true, success: false, msg: "Invalid JSON body." },
      { status: 400 },
    );
  }

  try {
    const body = parseCheckoutRequestBody(raw);
    const result = await aladPostJson("/api/v1/checkout/session", body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    if (e instanceof AladCheckoutValidationError) {
      return NextResponse.json(
        { error: true, success: false, msg: e.message },
        { status: 422 },
      );
    }
    if (e instanceof AladConfigError) {
      return NextResponse.json(
        { error: true, success: false, msg: e.message },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: true, success: false, msg: "Checkout session request failed." },
      { status: 502 },
    );
  }
}
