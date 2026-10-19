import pg from "pg";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Set DATABASE_URL (see .env.example).");
  process.exit(1);
}

const sslMode = process.env.DATABASE_SSL?.trim().toLowerCase();
/** @type {import("pg").PoolConfig} */
const config = { connectionString: url, max: 1 };
if (sslMode === "true") {
  config.ssl = { rejectUnauthorized: false };
} else if (sslMode === "require") {
  config.ssl = { rejectUnauthorized: true };
} else if (sslMode === "false" || sslMode === "disable") {
  config.ssl = false;
}

const pool = new pg.Pool(config);

try {
  const version = await pool.query("SELECT version()");
  console.log("Connected:", version.rows[0]?.version?.slice(0, 60) ?? "ok");
  await pool.query(`
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
  `);
  console.log("POS tables ready.");
} catch (err) {
  console.error("Connection failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
