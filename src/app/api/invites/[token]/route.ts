import { NextResponse } from "next/server";
import { getInvitePublicView } from "@/lib/auth/invites";
import { databaseConfigured } from "@/lib/db/pool";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!databaseConfigured()) {
    return NextResponse.json({ valid: false, reason: "Invites require database." }, { status: 503 });
  }
  const { token } = await context.params;
  const view = await getInvitePublicView(token);
  return NextResponse.json(view);
}
