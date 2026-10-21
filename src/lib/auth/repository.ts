import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import {
  companies,
  companyMembers,
  sessions,
  users,
} from "@/lib/db/schema";
import { ensureDatabaseSchema, getDb, type DbTransaction } from "@/lib/db/client";
import { hashPassword, validatePasswordPolicy, verifyPassword } from "@/lib/auth/password";
import { slugifyCompanyName, withUniqueSuffix } from "@/lib/auth/slug";
import { hashSessionToken, newSessionToken } from "@/lib/auth/session-token";
import { SESSION_MAX_AGE_SEC } from "@/lib/auth/session-cookie";
import type { AuthCompany, AuthUser, CompanyRole, SessionPayload } from "@/lib/auth/types";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function uniqueCompanySlug(name: string, tx: DbTransaction): Promise<string> {
  const base = slugifyCompanyName(name);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = withUniqueSuffix(base, attempt);
    const exists = await tx
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);
    if (exists.length === 0) return slug;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function registerOwnerWithCompany(input: {
  email: string;
  password: string;
  name: string;
  companyName: string;
}): Promise<{ token: string; session: SessionPayload }> {
  await ensureDatabaseSchema();
  const email = normalizeEmail(input.email);
  const policy = validatePasswordPolicy(input.password);
  if (policy) throw new Error(policy);
  if (!input.name.trim()) throw new Error("Name is required.");
  if (!input.companyName.trim()) throw new Error("Company name is required.");

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(input.password);
  const companyId = crypto.randomUUID();
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);

  await getDb().transaction(async (tx) => {
    const existing = await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length) throw new Error("An account with this email already exists.");

    await tx.insert(users).values({
      id: userId,
      email,
      name: input.name.trim(),
      passwordHash,
    });

    const slug = await uniqueCompanySlug(input.companyName, tx);
    await tx.insert(companies).values({
      id: companyId,
      name: input.companyName.trim(),
      slug,
      ownerUserId: userId,
    });
    await tx.insert(companyMembers).values({
      companyId,
      userId,
      role: "owner",
    });
    await tx.insert(sessions).values({
      id: crypto.randomUUID(),
      userId,
      companyId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    });
  });

  const session = await buildSessionPayload(userId, companyId);
  return { token, session };
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ token: string; session: SessionPayload }> {
  await ensureDatabaseSchema();
  const email = normalizeEmail(input.email);
  const row = await getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((r) => r[0]);
  if (!row) throw new Error("Invalid email or password.");
  const ok = await verifyPassword(input.password, row.passwordHash);
  if (!ok) throw new Error("Invalid email or password.");

  const companiesForUser = await listCompaniesForUser(row.id);
  const companyId = companiesForUser[0]?.id ?? null;
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);
  await getDb().insert(sessions).values({
    id: crypto.randomUUID(),
    userId: row.id,
    companyId,
    tokenHash: hashSessionToken(token),
    expiresAt,
  });
  const session = await buildSessionPayload(row.id, companyId);
  return { token, session };
}

export async function logoutSession(token: string): Promise<void> {
  if (!token) return;
  await ensureDatabaseSchema();
  await getDb().delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
}

export async function resolveSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  await ensureDatabaseSchema();
  const row = await getDb()
    .select({ userId: sessions.userId, companyId: sessions.companyId })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1)
    .then((r) => r[0]);
  if (!row) return null;
  return buildSessionPayload(row.userId, row.companyId);
}

export async function switchActiveCompany(
  token: string,
  companyId: string,
): Promise<SessionPayload | null> {
  const session = await resolveSession(token);
  if (!session) return null;
  if (!session.companies.some((c) => c.id === companyId)) return null;
  await getDb()
    .update(sessions)
    .set({ companyId })
    .where(eq(sessions.tokenHash, hashSessionToken(token)));
  return buildSessionPayload(session.user.id, companyId);
}

async function listCompaniesForUser(userId: string): Promise<AuthCompany[]> {
  const rows = await getDb()
    .select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
      role: companyMembers.role,
    })
    .from(companyMembers)
    .innerJoin(companies, eq(companies.id, companyMembers.companyId))
    .where(eq(companyMembers.userId, userId))
    .orderBy(asc(companies.name));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    role: r.role as CompanyRole,
  }));
}

export async function buildSessionPayload(
  userId: string,
  activeCompanyId: string | null,
): Promise<SessionPayload> {
  const user = await getDb()
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((r) => r[0]);
  if (!user) throw new Error("User not found.");
  const companiesForUser = await listCompaniesForUser(userId);
  let activeCompany = activeCompanyId
    ? (companiesForUser.find((c) => c.id === activeCompanyId) ?? null)
    : null;
  if (!activeCompany && companiesForUser.length > 0) activeCompany = companiesForUser[0] ?? null;
  return { user, companies: companiesForUser, activeCompany };
}

export type CompanyMember = {
  userId: string;
  email: string;
  name: string;
  role: CompanyRole;
  joinedAt: string;
};

export async function listCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  await ensureDatabaseSchema();
  const rows = await getDb()
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      role: companyMembers.role,
      joinedAt: companyMembers.createdAt,
    })
    .from(companyMembers)
    .innerJoin(users, eq(users.id, companyMembers.userId))
    .where(eq(companyMembers.companyId, companyId))
    .orderBy(desc(sql`${companyMembers.role} = 'owner'`), asc(users.name));
  return rows.map((r) => ({
    userId: r.userId,
    email: r.email,
    name: r.name,
    role: r.role as CompanyRole,
    joinedAt: r.joinedAt,
  }));
}

export async function addCompanyEmployee(input: {
  companyId: string;
  actorUserId: string;
  email: string;
  name: string;
  password: string;
  role: "admin" | "employee";
}): Promise<CompanyMember> {
  await ensureDatabaseSchema();
  const email = normalizeEmail(input.email);
  const policy = validatePasswordPolicy(input.password);
  if (policy) throw new Error(policy);
  if (!input.name.trim()) throw new Error("Employee name is required.");

  await getDb().transaction(async (tx) => {
    let userId: string;
    const existing = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then((r) => r[0]);
    if (existing) {
      userId = existing.id;
      const member = await tx
        .select({ userId: companyMembers.userId })
        .from(companyMembers)
        .where(and(eq(companyMembers.companyId, input.companyId), eq(companyMembers.userId, userId)))
        .limit(1);
      if (member.length) throw new Error("This user is already on your team.");
    } else {
      userId = crypto.randomUUID();
      const passwordHash = await hashPassword(input.password);
      await tx.insert(users).values({
        id: userId,
        email,
        name: input.name.trim(),
        passwordHash,
      });
    }
    await tx.insert(companyMembers).values({
      companyId: input.companyId,
      userId,
      role: input.role,
      invitedBy: input.actorUserId,
    });
  });

  const members = await listCompanyMembers(input.companyId);
  const created = members.find((m) => m.email === email);
  if (!created) throw new Error("Could not add team member.");
  return created;
}

export async function removeCompanyMember(input: {
  companyId: string;
  targetUserId: string;
}): Promise<void> {
  await ensureDatabaseSchema();
  const target = await getDb()
    .select({ role: companyMembers.role })
    .from(companyMembers)
    .where(
      and(eq(companyMembers.companyId, input.companyId), eq(companyMembers.userId, input.targetUserId)),
    )
    .limit(1)
    .then((r) => r[0]);
  if (!target) throw new Error("Member not found.");
  if (target.role === "owner") throw new Error("Cannot remove the company owner.");
  await getDb()
    .delete(companyMembers)
    .where(
      and(eq(companyMembers.companyId, input.companyId), eq(companyMembers.userId, input.targetUserId)),
    );
}

export async function getCompanyIdBySlug(slug: string): Promise<string | null> {
  await ensureDatabaseSchema();
  const row = await getDb()
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.slug, slug.trim().toLowerCase()))
    .limit(1)
    .then((r) => r[0]);
  return row?.id ?? null;
}
