import { Pool, type PoolConfig } from "pg";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function poolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const config: PoolConfig = { connectionString, max: 10 };
  const sslMode = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (sslMode === "true" || sslMode === "require") {
    config.ssl = { rejectUnauthorized: sslMode !== "true" ? true : false };
  }
  if (sslMode === "false" || sslMode === "disable") {
    config.ssl = false;
  }
  return config;
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(poolConfig());
  }
  return pool;
}

export async function ensurePosSchema(): Promise<void> {
  if (!databaseConfigured()) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      const client = await getPool().connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS pos_published_menu (
            id smallint PRIMARY KEY CHECK (id = 1),
            menu jsonb NOT NULL,
            updated_at bigint NOT NULL
          );

          CREATE TABLE IF NOT EXISTS pos_guest_orders (
            id uuid PRIMARY KEY,
            table_id text NOT NULL,
            table_label text NOT NULL,
            lines jsonb NOT NULL,
            note text NOT NULL DEFAULT '',
            created_at bigint NOT NULL,
            acknowledged boolean NOT NULL DEFAULT false
          );

          CREATE INDEX IF NOT EXISTS pos_guest_orders_pending_idx
            ON pos_guest_orders (acknowledged, created_at DESC);
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
