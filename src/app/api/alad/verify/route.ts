import { NextResponse } from "next/server";
import { AladVerifyValidationError, parseVerifyRequestBody } from "@/lib/alad/verify-request";
import { AladConfigError, aladPostJson, isAladConfigured } from "@/lib/alad/server";

export async function POST(request: Request) {
  if (!isAladConfigured()) {
    return NextResponse.json(
      {
        valid: false,
        status: "invalid",
        error: "Payment verification is not configured. Set ALAD_API_KEY on the server.",
      },
      { status: 503 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { valid: false, status: "invalid", error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  try {
    const body = parseVerifyRequestBody(raw);
    const result = await aladPostJson("/api/v2/verify", body);
    const headers = new Headers();
    if (result.cacheHeader) headers.set("X-Verify-Cache", result.cacheHeader);
    if (result.retryAfter) headers.set("Retry-After", result.retryAfter);
    return NextResponse.json(result.body, { status: result.status, headers });
  } catch (e) {
    if (e instanceof AladVerifyValidationError) {
      return NextResponse.json(
        { valid: false, status: "invalid", error: e.message },
        { status: 422 },
      );
    }
    if (e instanceof AladConfigError) {
      return NextResponse.json(
        { valid: false, status: "invalid", error: e.message },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { valid: false, status: "invalid", error: "Verification request failed." },
      { status: 502 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      configured: isAladConfigured(),
      endpoint: "POST /api/alad/verify proxies to https://api.alad.et/api/v2/verify",
    },
    { status: 200 },
  );
}
