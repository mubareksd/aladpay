import path from "node:path";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { databaseConfigured, getPool, closePoolForTests as closePool } from "@/lib/db/pool";
import * as schema from "@/lib/db/schema";

let db: MySql2Database<typeof schema> | null = null;
let schemaReady: Promise<void> | null = null;

export type Db = MySql2Database<typeof schema>;
export type DbTransaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

export function getDb(): Db {
  if (!db) {
    db = drizzle(getPool(), { schema, mode: "default" });
  }
  return db;
}

/** @deprecated use ensureDatabaseSchema */
export async function ensurePosSchema(): Promise<void> {
  await ensureDatabaseSchema();
}

export async function ensureDatabaseSchema(): Promise<void> {
  if (!databaseConfigured()) return;
  if (!schemaReady) {
    schemaReady = migrate(getDb(), {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
  }
  await schemaReady;
}

export async function closePoolForTests(): Promise<void> {
  db = null;
  schemaReady = null;
  await closePool();
}
