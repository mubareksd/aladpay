import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { switchActiveCompany } from "@/lib/auth/repository";
import { readSessionToken } from "@/lib/auth/guard";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session-cookie";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const gate = await requireSession();
  if (gate instanceof NextResponse) return gate;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const companyId = (body as { companyId?: string }).companyId;
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 422 });
  }
  const token = await readSessionToken();
  if (!token) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const session = await switchActiveCompany(token, companyId);
  if (!session) {
    return NextResponse.json({ error: "Company not available." }, { status: 403 });
  }
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  jar.set(SESSION_COOKIE, token, sessionCookieOptions(secure));
  return NextResponse.json({ ok: true, session });
}
