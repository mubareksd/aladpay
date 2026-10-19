import { NextResponse } from "next/server";
import { requireTeamAdmin } from "@/lib/auth/guard";
import {
  createCompanyInvite,
  inviteAcceptPath,
  listCompanyInvites,
  revokeCompanyInvite,
} from "@/lib/auth/invites";
import { getSiteUrl } from "@/lib/site-url";

function invitePublicUrl(token: string): string {
  return `${getSiteUrl()}${inviteAcceptPath(token)}`;
}

export async function GET() {
  const gate = await requireTeamAdmin();
  if (gate instanceof NextResponse) return gate;
  const invites = await listCompanyInvites(gate.activeCompany!.id);
  const pending = invites
    .filter((i) => !i.acceptedAt && new Date(i.expiresAt).getTime() > Date.now())
    .map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      expiresAt: i.expiresAt,
      acceptUrl: invitePublicUrl(i.token),
    }));
  return NextResponse.json({ invites: pending });
}

export async function POST(request: Request) {
  const gate = await requireTeamAdmin();
  if (gate instanceof NextResponse) return gate;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const input = body as { email?: string; role?: "admin" | "employee" };
  if (!input.email) {
    return NextResponse.json({ error: "email required" }, { status: 422 });
  }
  const role = input.role === "admin" ? "admin" : "employee";
  if (role === "admin" && gate.activeCompany!.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can invite admins." }, { status: 403 });
  }
  try {
    const invite = await createCompanyInvite({
      companyId: gate.activeCompany!.id,
      invitedBy: gate.user.id,
      email: input.email,
      role,
    });
    return NextResponse.json({
      ok: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        acceptUrl: invitePublicUrl(invite.token),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create invite.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const gate = await requireTeamAdmin();
  if (gate instanceof NextResponse) return gate;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const inviteId = (body as { inviteId?: string }).inviteId;
  if (!inviteId) {
    return NextResponse.json({ error: "inviteId required" }, { status: 422 });
  }
  await revokeCompanyInvite(gate.activeCompany!.id, inviteId);
  return NextResponse.json({ ok: true });
}
