import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { acceptCompanyInvite } from "@/lib/auth/invites";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session-cookie";
import { databaseConfigured } from "@/lib/db/pool";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }
  const { token } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const input = body as { name?: string; password?: string };
  if (!input.password) {
    return NextResponse.json({ error: "password required" }, { status: 422 });
  }
  try {
    const { token: sessionToken, session } = await acceptCompanyInvite({
      token,
      name: input.name,
      password: input.password,
    });
    const jar = await cookies();
    const secure = process.env.NODE_ENV === "production";
    jar.set(SESSION_COOKIE, sessionToken, sessionCookieOptions(secure));
    return NextResponse.json({ ok: true, session });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not accept invite.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
