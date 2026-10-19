import { NextResponse } from "next/server";
import { requireTeamAdmin } from "@/lib/auth/guard";
import {
  addCompanyEmployee,
  listCompanyMembers,
  removeCompanyMember,
} from "@/lib/auth/repository";
import { canRemoveMember } from "@/lib/auth/roles";

export async function GET() {
  const gate = await requireTeamAdmin();
  if (gate instanceof NextResponse) return gate;
  const members = await listCompanyMembers(gate.activeCompany!.id);
  return NextResponse.json({ members });
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
  const input = body as {
    email?: string;
    name?: string;
    password?: string;
    role?: "admin" | "employee";
  };
  if (!input.email || !input.name || !input.password) {
    return NextResponse.json({ error: "email, name, and password required." }, { status: 422 });
  }
  const role = input.role === "admin" ? "admin" : "employee";
  if (role === "admin" && gate.activeCompany!.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can add admins." }, { status: 403 });
  }
  try {
    const member = await addCompanyEmployee({
      companyId: gate.activeCompany!.id,
      actorUserId: gate.user.id,
      email: input.email,
      name: input.name,
      password: input.password,
      role,
    });
    return NextResponse.json({ ok: true, member });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not add member.";
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
  const userId = (body as { userId?: string }).userId;
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 422 });
  }
  const members = await listCompanyMembers(gate.activeCompany!.id);
  const target = members.find((m) => m.userId === userId);
  if (!target) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  if (!canRemoveMember(gate.activeCompany!.role, target.role)) {
    return NextResponse.json({ error: "Not allowed to remove this member." }, { status: 403 });
  }
  await removeCompanyMember({ companyId: gate.activeCompany!.id, targetUserId: userId });
  return NextResponse.json({ ok: true });
}
