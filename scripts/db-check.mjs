import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Set DATABASE_URL (see .env.example).");
  process.exit(1);
}

if (!/^mysql:\/\//i.test(url)) {
  console.error("DATABASE_URL must be mysql://USER:PASSWORD@HOST:3306/DATABASE");
  process.exit(1);
}

const parsed = new URL(url.replace(/^mysql:\/\//, "mysql2://"));
const sslMode = process.env.DATABASE_SSL?.trim().toLowerCase();
/** @type {import("mysql2/promise").PoolOptions} */
const config = {
  host: parsed.hostname,
  port: parsed.port ? Number(parsed.port) : 3306,
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, ""),
  connectionLimit: 1,
  connectTimeout: 10_000,
};
if (sslMode === "true") config.ssl = { rejectUnauthorized: false };
else if (sslMode === "require") config.ssl = { rejectUnauthorized: true };

const pool = mysql.createPool(config);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const [rows] = await pool.query("SELECT VERSION() AS version");
  const version = rows[0]?.version ?? "ok";
  console.log("Connected:", String(version).slice(0, 60));
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: path.join(root, "drizzle") });
  console.log("Drizzle migrations applied.");
} catch (err) {
  console.error("Connection failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
