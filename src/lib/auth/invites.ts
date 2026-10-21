import { randomBytes } from "crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { companies, companyInvites, companyMembers, sessions, users } from "@/lib/db/schema";
import { ensureDatabaseSchema, getDb } from "@/lib/db/client";
import { hashPassword, validatePasswordPolicy, verifyPassword } from "@/lib/auth/password";
import { hashSessionToken, newSessionToken } from "@/lib/auth/session-token";
import { SESSION_MAX_AGE_SEC } from "@/lib/auth/session-cookie";
import { buildSessionPayload, normalizeEmail } from "@/lib/auth/repository";
import type { CompanyRole } from "@/lib/auth/types";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CompanyInvite = {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  email: string;
  role: "admin" | "employee";
  token: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
};

function newInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createCompanyInvite(input: {
  companyId: string;
  invitedBy: string;
  email: string;
  role: "admin" | "employee";
}): Promise<CompanyInvite> {
  await ensureDatabaseSchema();
  const email = normalizeEmail(input.email);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const token = newInviteToken();

  const pending = await getDb()
    .select({ id: companyInvites.id })
    .from(companyInvites)
    .where(
      and(
        eq(companyInvites.companyId, input.companyId),
        eq(companyInvites.email, email),
        isNull(companyInvites.acceptedAt),
        gt(companyInvites.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (pending.length) {
    throw new Error("An invite is already pending for this email.");
  }

  const member = await getDb()
    .select({ userId: users.id })
    .from(companyMembers)
    .innerJoin(users, eq(users.id, companyMembers.userId))
    .where(and(eq(companyMembers.companyId, input.companyId), eq(users.email, email)))
    .limit(1);
  if (member.length) {
    throw new Error("This person is already on your team.");
  }

  const id = crypto.randomUUID();
  await getDb().insert(companyInvites).values({
    id,
    companyId: input.companyId,
    email,
    role: input.role,
    token,
    invitedBy: input.invitedBy,
    expiresAt,
  });
  const invites = await listCompanyInvites(input.companyId);
  const created = invites.find((i) => i.id === id);
  if (!created) throw new Error("Could not create invite.");
  return created;
}

export async function listCompanyInvites(companyId: string): Promise<CompanyInvite[]> {
  await ensureDatabaseSchema();
  const rows = await getDb()
    .select({
      id: companyInvites.id,
      companyId: companyInvites.companyId,
      companyName: companies.name,
      companySlug: companies.slug,
      email: companyInvites.email,
      role: companyInvites.role,
      token: companyInvites.token,
      createdAt: companyInvites.createdAt,
      expiresAt: companyInvites.expiresAt,
      acceptedAt: companyInvites.acceptedAt,
    })
    .from(companyInvites)
    .innerJoin(companies, eq(companies.id, companyInvites.companyId))
    .where(eq(companyInvites.companyId, companyId))
    .orderBy(desc(companyInvites.createdAt))
    .limit(50);
  return rows.map((r) => ({
    id: r.id,
    companyId: r.companyId,
    companyName: r.companyName,
    companySlug: r.companySlug,
    email: r.email,
    role: r.role as "admin" | "employee",
    token: r.token,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt instanceof Date ? r.expiresAt.toISOString() : String(r.expiresAt),
    acceptedAt: r.acceptedAt,
  }));
}

export async function revokeCompanyInvite(companyId: string, inviteId: string): Promise<void> {
  await ensureDatabaseSchema();
  await getDb()
    .delete(companyInvites)
    .where(
      and(
        eq(companyInvites.id, inviteId),
        eq(companyInvites.companyId, companyId),
        isNull(companyInvites.acceptedAt),
      ),
    );
}

export type InvitePublicView = {
  valid: boolean;
  reason?: string;
  companyName?: string;
  email?: string;
  role?: string;
  existingUser?: boolean;
};

export async function getInvitePublicView(token: string): Promise<InvitePublicView> {
  await ensureDatabaseSchema();
  const row = await getDb()
    .select({
      email: companyInvites.email,
      role: companyInvites.role,
      acceptedAt: companyInvites.acceptedAt,
      expiresAt: companyInvites.expiresAt,
      companyName: companies.name,
    })
    .from(companyInvites)
    .innerJoin(companies, eq(companies.id, companyInvites.companyId))
    .where(eq(companyInvites.token, token))
    .limit(1)
    .then((r) => r[0]);
  if (!row) return { valid: false, reason: "Invite not found." };
  if (row.acceptedAt) return { valid: false, reason: "This invite was already used." };
  const expiresMs =
    row.expiresAt instanceof Date ? row.expiresAt.getTime() : new Date(row.expiresAt).getTime();
  if (expiresMs < Date.now()) {
    return { valid: false, reason: "This invite has expired." };
  }
  const user = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, row.email))
    .limit(1);
  return {
    valid: true,
    companyName: row.companyName,
    email: row.email,
    role: row.role,
    existingUser: user.length > 0,
  };
}

export async function acceptCompanyInvite(input: {
  token: string;
  name?: string;
  password: string;
}): Promise<{ token: string; session: Awaited<ReturnType<typeof buildSessionPayload>> }> {
  await ensureDatabaseSchema();

  const invite = await getDb()
    .select({
      id: companyInvites.id,
      companyId: companyInvites.companyId,
      email: companyInvites.email,
      role: companyInvites.role,
      acceptedAt: companyInvites.acceptedAt,
      expiresAt: companyInvites.expiresAt,
    })
    .from(companyInvites)
    .where(eq(companyInvites.token, input.token))
    .limit(1)
    .then((r) => r[0]);
  if (!invite) throw new Error("Invite not found.");
  if (invite.acceptedAt) throw new Error("Invite already used.");
  const expiresMs =
    invite.expiresAt instanceof Date
      ? invite.expiresAt.getTime()
      : new Date(invite.expiresAt).getTime();
  if (expiresMs < Date.now()) throw new Error("Invite expired.");

  const email = invite.email;
  let userId = "";
  let sessionToken = "";

  await getDb().transaction(async (tx) => {
    const existing = await tx
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then((r) => r[0]);
    if (existing) {
      const ok = await verifyPassword(input.password, existing.passwordHash);
      if (!ok) throw new Error("Incorrect password for this account.");
      userId = existing.id;
    } else {
      const policy = validatePasswordPolicy(input.password);
      if (policy) throw new Error(policy);
      if (!input.name?.trim()) throw new Error("Name is required.");
      userId = crypto.randomUUID();
      const passwordHash = await hashPassword(input.password);
      await tx.insert(users).values({
        id: userId,
        email,
        name: input.name.trim(),
        passwordHash,
      });
    }

    await tx
      .insert(companyMembers)
      .values({
        companyId: invite.companyId,
        userId,
        role: invite.role as CompanyRole,
      })
      .onDuplicateKeyUpdate({ set: { role: invite.role as CompanyRole } });
    await tx
      .update(companyInvites)
      .set({ acceptedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(companyInvites.id, invite.id));

    sessionToken = newSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);
    await tx.insert(sessions).values({
      id: crypto.randomUUID(),
      userId,
      companyId: invite.companyId,
      tokenHash: hashSessionToken(sessionToken),
      expiresAt,
    });
  });

  const session = await buildSessionPayload(userId, invite.companyId);
  return { token: sessionToken, session };
}

export function inviteAcceptPath(token: string): string {
  return `/invites/${token}`;
}
