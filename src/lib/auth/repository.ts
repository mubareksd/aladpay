import { ensureDatabaseSchema, getPool } from "@/lib/db/pool";
import { hashPassword, validatePasswordPolicy, verifyPassword } from "@/lib/auth/password";
import { slugifyCompanyName, withUniqueSuffix } from "@/lib/auth/slug";
import { hashSessionToken, newSessionToken } from "@/lib/auth/session-token";
import { SESSION_MAX_AGE_SEC } from "@/lib/auth/session-cookie";
import type { AuthCompany, AuthUser, CompanyRole, SessionPayload } from "@/lib/auth/types";

type UserRow = { id: string; email: string; name: string; password_hash: string };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function uniqueCompanySlug(name: string, client: import("pg").PoolClient): Promise<string> {
  const base = slugifyCompanyName(name);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = withUniqueSuffix(base, attempt);
    const exists = await client.query("SELECT 1 FROM companies WHERE slug = $1", [slug]);
    if (exists.rowCount === 0) return slug;
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

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT 1 FROM users WHERE email = $1", [email]);
    if (existing.rowCount) throw new Error("An account with this email already exists.");

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(input.password);
    await client.query(
      `INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)`,
      [userId, email, input.name.trim(), passwordHash],
    );

    const companyId = crypto.randomUUID();
    const slug = await uniqueCompanySlug(input.companyName, client);
    await client.query(
      `INSERT INTO companies (id, name, slug, owner_user_id) VALUES ($1, $2, $3, $4)`,
      [companyId, input.companyName.trim(), slug, userId],
    );
    await client.query(
      `INSERT INTO company_members (company_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [companyId, userId],
    );

    const token = newSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);
    await client.query(
      `INSERT INTO sessions (id, user_id, company_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [crypto.randomUUID(), userId, companyId, hashSessionToken(token), expiresAt.toISOString()],
    );
    await client.query("COMMIT");

    const session = await buildSessionPayload(userId, companyId);
    return { token, session };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ token: string; session: SessionPayload }> {
  await ensureDatabaseSchema();
  const email = normalizeEmail(input.email);
  const result = await getPool().query<UserRow>(
    "SELECT id, email, name, password_hash FROM users WHERE email = $1",
    [email],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Invalid email or password.");
  const ok = await verifyPassword(input.password, row.password_hash);
  if (!ok) throw new Error("Invalid email or password.");

  const companies = await listCompaniesForUser(row.id);
  const companyId = companies[0]?.id ?? null;
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);
  await getPool().query(
    `INSERT INTO sessions (id, user_id, company_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [crypto.randomUUID(), row.id, companyId, hashSessionToken(token), expiresAt.toISOString()],
  );
  const session = await buildSessionPayload(row.id, companyId);
  return { token, session };
}

export async function logoutSession(token: string): Promise<void> {
  if (!token) return;
  await ensureDatabaseSchema();
  await getPool().query("DELETE FROM sessions WHERE token_hash = $1", [hashSessionToken(token)]);
}

export async function resolveSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  await ensureDatabaseSchema();
  const result = await getPool().query<{ user_id: string; company_id: string | null }>(
    `SELECT user_id, company_id FROM sessions
     WHERE token_hash = $1 AND expires_at > now()`,
    [hashSessionToken(token)],
  );
  const row = result.rows[0];
  if (!row) return null;
  return buildSessionPayload(row.user_id, row.company_id);
}

export async function switchActiveCompany(
  token: string,
  companyId: string,
): Promise<SessionPayload | null> {
  const session = await resolveSession(token);
  if (!session) return null;
  if (!session.companies.some((c) => c.id === companyId)) return null;
  await getPool().query(
    `UPDATE sessions SET company_id = $1 WHERE token_hash = $2`,
    [companyId, hashSessionToken(token)],
  );
  return buildSessionPayload(session.user.id, companyId);
}

async function listCompaniesForUser(userId: string): Promise<AuthCompany[]> {
  const result = await getPool().query<{ id: string; name: string; slug: string; role: CompanyRole }>(
    `SELECT c.id, c.name, c.slug, m.role
     FROM company_members m
     JOIN companies c ON c.id = m.company_id
     WHERE m.user_id = $1
     ORDER BY c.name`,
    [userId],
  );
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    role: r.role,
  }));
}

async function buildSessionPayload(
  userId: string,
  activeCompanyId: string | null,
): Promise<SessionPayload> {
  const userResult = await getPool().query<AuthUser>(
    "SELECT id, email, name FROM users WHERE id = $1",
    [userId],
  );
  const user = userResult.rows[0];
  if (!user) throw new Error("User not found.");
  const companies = await listCompaniesForUser(userId);
  let activeCompany = activeCompanyId
    ? (companies.find((c) => c.id === activeCompanyId) ?? null)
    : null;
  if (!activeCompany && companies.length > 0) activeCompany = companies[0] ?? null;
  return { user, companies, activeCompany };
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
  const result = await getPool().query<{
    user_id: string;
    email: string;
    name: string;
    role: CompanyRole;
    created_at: string;
  }>(
    `SELECT u.id AS user_id, u.email, u.name, m.role, m.created_at
     FROM company_members m
     JOIN users u ON u.id = m.user_id
     WHERE m.company_id = $1
     ORDER BY m.role = 'owner' DESC, u.name`,
    [companyId],
  );
  return result.rows.map((r) => ({
    userId: r.user_id,
    email: r.email,
    name: r.name,
    role: r.role,
    joinedAt: r.created_at,
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

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    let userId: string;
    const existing = await client.query<UserRow>(
      "SELECT id, email, name, password_hash FROM users WHERE email = $1",
      [email],
    );
    if (existing.rows[0]) {
      userId = existing.rows[0].id;
      const member = await client.query(
        "SELECT 1 FROM company_members WHERE company_id = $1 AND user_id = $2",
        [input.companyId, userId],
      );
      if (member.rowCount) throw new Error("This user is already on your team.");
    } else {
      userId = crypto.randomUUID();
      const passwordHash = await hashPassword(input.password);
      await client.query(
        `INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)`,
        [userId, email, input.name.trim(), passwordHash],
      );
    }
    await client.query(
      `INSERT INTO company_members (company_id, user_id, role, invited_by)
       VALUES ($1, $2, $3, $4)`,
      [input.companyId, userId, input.role, input.actorUserId],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

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
  const target = await getPool().query<{ role: CompanyRole }>(
    "SELECT role FROM company_members WHERE company_id = $1 AND user_id = $2",
    [input.companyId, input.targetUserId],
  );
  if (!target.rows[0]) throw new Error("Member not found.");
  if (target.rows[0].role === "owner") throw new Error("Cannot remove the company owner.");
  await getPool().query(
    "DELETE FROM company_members WHERE company_id = $1 AND user_id = $2",
    [input.companyId, input.targetUserId],
  );
}

export async function getCompanyIdBySlug(slug: string): Promise<string | null> {
  await ensureDatabaseSchema();
  const result = await getPool().query<{ id: string }>(
    "SELECT id FROM companies WHERE slug = $1",
    [slug.trim().toLowerCase()],
  );
  return result.rows[0]?.id ?? null;
}
