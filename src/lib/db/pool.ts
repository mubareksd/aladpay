import { Pool, type PoolConfig } from "pg";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.VERCEL ||
      process.env.CF_PAGES,
  );
}

function inferSsl(connectionString: string): PoolConfig["ssl"] | undefined {
  const sslMode = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (sslMode === "false" || sslMode === "disable") return false;
  if (sslMode === "true") return { rejectUnauthorized: false };
  if (sslMode === "require") return { rejectUnauthorized: true };

  try {
    const host = new URL(connectionString.replace(/^postgres(ql)?:\/\//, "postgresql://")).hostname;
    const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
    if (!local) {
      return { rejectUnauthorized: false };
    }
  } catch {
    /* keep driver default */
  }
  return undefined;
}

function poolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const config: PoolConfig = {
    connectionString,
    max: isServerlessRuntime() ? 1 : 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: isServerlessRuntime() ? 5_000 : 30_000,
  };
  const ssl = inferSsl(connectionString);
  if (ssl !== undefined) config.ssl = ssl;
  return config;
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(poolConfig());
  }
  return pool;
}

/** @deprecated use ensureDatabaseSchema */
export async function ensurePosSchema(): Promise<void> {
  await ensureDatabaseSchema();
}

export async function ensureDatabaseSchema(): Promise<void> {
  if (!databaseConfigured()) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      const client = await getPool().connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id uuid PRIMARY KEY,
            email text NOT NULL UNIQUE,
            name text NOT NULL,
            password_hash text NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS companies (
            id uuid PRIMARY KEY,
            name text NOT NULL,
            slug text NOT NULL UNIQUE,
            owner_user_id uuid NOT NULL REFERENCES users(id),
            created_at timestamptz NOT NULL DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS company_members (
            company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role text NOT NULL CHECK (role IN ('owner', 'admin', 'employee')),
            invited_by uuid REFERENCES users(id),
            created_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY (company_id, user_id)
          );

          CREATE TABLE IF NOT EXISTS sessions (
            id uuid PRIMARY KEY,
            user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
            token_hash text NOT NULL UNIQUE,
            expires_at timestamptz NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
          );

          CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id, expires_at DESC);

          CREATE TABLE IF NOT EXISTS pos_published_menu (
            company_id uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
            menu jsonb NOT NULL,
            updated_at bigint NOT NULL
          );

          CREATE TABLE IF NOT EXISTS pos_guest_orders (
            id uuid PRIMARY KEY,
            company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            table_id text NOT NULL,
            table_label text NOT NULL,
            lines jsonb NOT NULL,
            note text NOT NULL DEFAULT '',
            created_at bigint NOT NULL,
            acknowledged boolean NOT NULL DEFAULT false
          );

          CREATE INDEX IF NOT EXISTS pos_guest_orders_pending_idx
            ON pos_guest_orders (company_id, acknowledged, created_at DESC);

          CREATE TABLE IF NOT EXISTS company_invites (
            id uuid PRIMARY KEY,
            company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            email text NOT NULL,
            role text NOT NULL CHECK (role IN ('admin', 'employee')),
            token text NOT NULL UNIQUE,
            invited_by uuid REFERENCES users(id),
            created_at timestamptz NOT NULL DEFAULT now(),
            expires_at timestamptz NOT NULL,
            accepted_at timestamptz
          );

          CREATE INDEX IF NOT EXISTS company_invites_company_idx
            ON company_invites (company_id, created_at DESC);
        `);
      } finally {
        client.release();
      }
    })();
  }
  await schemaReady;
}

export async function closePoolForTests(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    schemaReady = null;
  }
}
