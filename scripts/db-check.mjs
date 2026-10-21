import mysql from "mysql2/promise";

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

try {
  const [rows] = await pool.query("SELECT VERSION() AS version");
  const version = rows[0]?.version ?? "ok";
  console.log("Connected:", String(version).slice(0, 60));
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log("Schema bootstrap OK (users table).");
} catch (err) {
  console.error("Connection failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
