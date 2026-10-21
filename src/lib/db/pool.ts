import mysql, { type Pool, type PoolConnection, type ResultSetHeader } from "mysql2/promise";
import { toMysqlSql } from "@/lib/db/sql";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export type QueryResult<T> = {
  rows: T[];
  rowCount: number;
};

export type DbQueryParams = (string | number | boolean | Date | null | Buffer)[];

export type DbConn = {
  query<T>(sql: string, params?: DbQueryParams): Promise<QueryResult<T>>;
};

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

function parseDatabaseUrl(url: string): mysql.PoolOptions {
  const parsed = new URL(url.replace(/^mysql:\/\//, "mysql2://"));
  const database = parsed.pathname.replace(/^\//, "");
  const sslMode = process.env.DATABASE_SSL?.trim().toLowerCase();
  let ssl: mysql.PoolOptions["ssl"];
  if (sslMode === "true") ssl = { rejectUnauthorized: false };
  else if (sslMode === "require") ssl = { rejectUnauthorized: true };
  else if (sslMode === "false" || sslMode === "disable") ssl = undefined;

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    waitForConnections: true,
    connectionLimit: isServerlessRuntime() ? 2 : 10,
    queueLimit: 0,
    connectTimeout: 10_000,
    ssl,
  };
}

export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) throw new Error("DATABASE_URL is not set");
    if (!/^mysql:\/\//i.test(url)) {
      throw new Error("DATABASE_URL must be a mysql:// connection string.");
    }
    pool = mysql.createPool(parseDatabaseUrl(url));
  }
  return pool;
}

async function runQuery<T>(
  runner: Pool | PoolConnection,
  sql: string,
  params: (string | number | boolean | Date | null | Buffer)[] = [],
): Promise<QueryResult<T>> {
  const q = toMysqlSql(sql);
  const [result] = await runner.execute(q, params);
  if (Array.isArray(result)) {
    return { rows: result as T[], rowCount: result.length };
  }
  const header = result as ResultSetHeader;
  return { rows: [], rowCount: header.affectedRows ?? 0 };
}

export async function query<T>(sql: string, params: DbQueryParams = []): Promise<QueryResult<T>> {
  return runQuery<T>(getPool(), sql, params);
}

function wrapConnection(raw: PoolConnection): DbConn {
  return {
    query: <T>(sql: string, params: DbQueryParams = []) => runQuery<T>(raw, sql, params),
  };
}

export async function withTransaction<T>(fn: (conn: DbConn) => Promise<T>): Promise<T> {
  const raw = await getPool().getConnection();
  const conn = wrapConnection(raw);
  await raw.beginTransaction();
  try {
    const result = await fn(conn);
    await raw.commit();
    return result;
  } catch (e) {
    await raw.rollback();
    throw e;
  } finally {
    raw.release();
  }
}

/** @deprecated use ensureDatabaseSchema */
export async function ensurePosSchema(): Promise<void> {
  await ensureDatabaseSchema();
}

export async function ensureDatabaseSchema(): Promise<void> {
  if (!databaseConfigured()) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id CHAR(36) PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS companies (
          id CHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(64) NOT NULL UNIQUE,
          owner_user_id CHAR(36) NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_companies_owner FOREIGN KEY (owner_user_id) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS company_members (
          company_id CHAR(36) NOT NULL,
          user_id CHAR(36) NOT NULL,
          role VARCHAR(16) NOT NULL,
          invited_by CHAR(36) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (company_id, user_id),
          CONSTRAINT fk_members_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
          CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id CHAR(36) PRIMARY KEY,
          user_id CHAR(36) NOT NULL,
          company_id CHAR(36) NULL,
          token_hash VARCHAR(128) NOT NULL UNIQUE,
          expires_at DATETIME NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX sessions_user_idx (user_id, expires_at),
          CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS pos_published_menu (
          company_id CHAR(36) PRIMARY KEY,
          menu JSON NOT NULL,
          updated_at BIGINT NOT NULL,
          CONSTRAINT fk_menu_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS pos_guest_orders (
          id CHAR(36) PRIMARY KEY,
          company_id CHAR(36) NOT NULL,
          table_id VARCHAR(64) NOT NULL,
          table_label VARCHAR(255) NOT NULL,
          lines JSON NOT NULL,
          note TEXT NOT NULL,
          created_at BIGINT NOT NULL,
          acknowledged TINYINT(1) NOT NULL DEFAULT 0,
          INDEX pos_guest_pending_idx (company_id, acknowledged, created_at),
          CONSTRAINT fk_guest_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS company_invites (
          id CHAR(36) PRIMARY KEY,
          company_id CHAR(36) NOT NULL,
          email VARCHAR(255) NOT NULL,
          role VARCHAR(16) NOT NULL,
          token VARCHAR(128) NOT NULL UNIQUE,
          invited_by CHAR(36) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          accepted_at DATETIME NULL,
          INDEX company_invites_company_idx (company_id, created_at),
          CONSTRAINT fk_invites_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
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
