import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logoutSession } from "@/lib/auth/repository";
import { readSessionToken } from "@/lib/auth/guard";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session-cookie";

export async function POST() {
  const token = await readSessionToken();
  if (token) await logoutSession(token);
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions(secure), maxAge: 0 });
  return NextResponse.json({ ok: true });
}
