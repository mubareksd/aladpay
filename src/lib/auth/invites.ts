import { randomBytes } from "crypto";
import { ensureDatabaseSchema, getPool } from "@/lib/db/pool";
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

  const pending = await getPool().query(
    `SELECT id FROM company_invites
     WHERE company_id = $1 AND email = $2 AND accepted_at IS NULL AND expires_at > now()`,
    [input.companyId, email],
  );
  if (pending.rowCount) {
    throw new Error("An invite is already pending for this email.");
  }

  const member = await getPool().query(
    `SELECT 1 FROM company_members m JOIN users u ON u.id = m.user_id
     WHERE m.company_id = $1 AND u.email = $2`,
    [input.companyId, email],
  );
  if (member.rowCount) {
    throw new Error("This person is already on your team.");
  }

  const id = crypto.randomUUID();
  await getPool().query(
    `INSERT INTO company_invites (id, company_id, email, role, token, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, input.companyId, email, input.role, token, input.invitedBy, expiresAt.toISOString()],
  );
  const invites = await listCompanyInvites(input.companyId);
  const created = invites.find((i) => i.id === id);
  if (!created) throw new Error("Could not create invite.");
  return created;
}

export async function listCompanyInvites(companyId: string): Promise<CompanyInvite[]> {
  await ensureDatabaseSchema();
  const result = await getPool().query<{
    id: string;
    company_id: string;
    company_name: string;
    company_slug: string;
    email: string;
    role: "admin" | "employee";
    token: string;
    created_at: string;
    expires_at: string;
    accepted_at: string | null;
  }>(
    `SELECT i.id, i.company_id, c.name AS company_name, c.slug AS company_slug,
            i.email, i.role, i.token, i.created_at, i.expires_at, i.accepted_at
     FROM company_invites i
     JOIN companies c ON c.id = i.company_id
     WHERE i.company_id = $1
     ORDER BY i.created_at DESC
     LIMIT 50`,
    [companyId],
  );
  return result.rows.map((r) => ({
    id: r.id,
    companyId: r.company_id,
    companyName: r.company_name,
    companySlug: r.company_slug,
    email: r.email,
    role: r.role,
    token: r.token,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    acceptedAt: r.accepted_at,
  }));
}

export async function revokeCompanyInvite(companyId: string, inviteId: string): Promise<void> {
  await ensureDatabaseSchema();
  await getPool().query(
    `DELETE FROM company_invites WHERE id = $1 AND company_id = $2 AND accepted_at IS NULL`,
    [inviteId, companyId],
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
  const result = await getPool().query<{
    email: string;
    role: string;
    accepted_at: string | null;
    expires_at: string;
    company_name: string;
  }>(
    `SELECT i.email, i.role, i.accepted_at, i.expires_at, c.name AS company_name
     FROM company_invites i
     JOIN companies c ON c.id = i.company_id
     WHERE i.token = $1`,
    [token],
  );
  const row = result.rows[0];
  if (!row) return { valid: false, reason: "Invite not found." };
  if (row.accepted_at) return { valid: false, reason: "This invite was already used." };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { valid: false, reason: "This invite has expired." };
  }
  const user = await getPool().query("SELECT 1 FROM users WHERE email = $1", [row.email]);
  return {
    valid: true,
    companyName: row.company_name,
    email: row.email,
    role: row.role,
    existingUser: (user.rowCount ?? 0) > 0,
  };
}

export async function acceptCompanyInvite(input: {
  token: string;
  name?: string;
  password: string;
}): Promise<{ token: string; session: Awaited<ReturnType<typeof buildSessionPayload>> }> {
  await ensureDatabaseSchema();

  const inviteRow = await getPool().query<{
    id: string;
    company_id: string;
    email: string;
    role: CompanyRole;
    accepted_at: string | null;
    expires_at: string;
  }>("SELECT * FROM company_invites WHERE token = $1", [input.token]);
  const invite = inviteRow.rows[0];
  if (!invite) throw new Error("Invite not found.");
  if (invite.accepted_at) throw new Error("Invite already used.");
  if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("Invite expired.");

  const email = invite.email;
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ id: string; password_hash: string }>(
      "SELECT id, password_hash FROM users WHERE email = $1",
      [email],
    );
    let userId: string;
    if (existing.rows[0]) {
      const ok = await verifyPassword(input.password, existing.rows[0].password_hash);
      if (!ok) throw new Error("Incorrect password for this account.");
      userId = existing.rows[0].id;
    } else {
      const policy = validatePasswordPolicy(input.password);
      if (policy) throw new Error(policy);
      if (!input.name?.trim()) throw new Error("Name is required.");
      userId = crypto.randomUUID();
      const passwordHash = await hashPassword(input.password);
      await client.query(
        `INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)`,
        [userId, email, input.name.trim(), passwordHash],
      );
    }

    await client.query(
      `INSERT INTO company_members (company_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (company_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [invite.company_id, userId, invite.role],
    );
    await client.query(`UPDATE company_invites SET accepted_at = now() WHERE id = $1`, [invite.id]);

    const sessionToken = newSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);
    await client.query(
      `INSERT INTO sessions (id, user_id, company_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [crypto.randomUUID(), userId, invite.company_id, hashSessionToken(sessionToken), expiresAt.toISOString()],
    );
    await client.query("COMMIT");

    const session = await buildSessionPayload(userId, invite.company_id);
    return { token: sessionToken, session };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export function inviteAcceptPath(token: string): string {
  return `/invites/${token}`;
}
