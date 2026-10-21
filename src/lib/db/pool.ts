import mysql, { type Pool } from "mysql2/promise";

let pool: Pool | null = null;

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

export async function closePoolForTests(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
