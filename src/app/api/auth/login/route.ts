import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginUser } from "@/lib/auth/repository";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session-cookie";
import { databaseConfigured } from "@/lib/db/pool";

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const input = body as { email?: string; password?: string };
  if (!input.email || !input.password) {
    return NextResponse.json({ error: "Email and password required." }, { status: 422 });
  }
  try {
    const { token, session } = await loginUser({
      email: input.email,
      password: input.password,
    });
    const jar = await cookies();
    const secure = process.env.NODE_ENV === "production";
    jar.set(SESSION_COOKIE, token, sessionCookieOptions(secure));
    return NextResponse.json({ ok: true, session });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sign in failed.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
