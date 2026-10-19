import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { databaseConfigured } from "@/lib/db/pool";
import { canManageMembers, canPublishPos } from "@/lib/auth/roles";
import { resolveSession } from "@/lib/auth/repository";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";
import type { SessionPayload } from "@/lib/auth/types";

export function authRequiredForApp(): boolean {
  return databaseConfigured();
}

export async function readSessionToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value;
}

export async function getServerSession(): Promise<SessionPayload | null> {
  if (!databaseConfigured()) return null;
  const token = await readSessionToken();
  return resolveSession(token);
}

export async function requireSession(): Promise<SessionPayload | NextResponse> {
  if (!databaseConfigured()) {
    return NextResponse.json(
      { error: "Sign-in requires DATABASE_URL on the server." },
      { status: 503 },
    );
  }
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!session.activeCompany) {
    return NextResponse.json({ error: "No company selected." }, { status: 403 });
  }
  return session;
}

/** null = file-store mode without auth */
export async function requirePosAccess(): Promise<SessionPayload | NextResponse | null> {
  if (!databaseConfigured()) return null;
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  if (!canPublishPos(session.activeCompany!.role)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  return session;
}

export async function requireTeamAdmin(): Promise<SessionPayload | NextResponse> {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Team management requires DATABASE_URL." }, { status: 503 });
  }
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  if (!canManageMembers(session.activeCompany!.role)) {
    return NextResponse.json({ error: "Only owners and admins can manage the team." }, { status: 403 });
  }
  return session;
}
