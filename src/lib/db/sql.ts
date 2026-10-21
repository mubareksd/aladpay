/** Convert Postgres-style $1 placeholders to MySQL ? (same param order). */
export function toMysqlSql(sql: string): string {
  return sql.replace(/\$(\d+)/g, "?");
}

export function parseJsonColumn<T>(value: unknown): T {
  if (value == null) return value as T;
  if (typeof value === "string") return JSON.parse(value) as T;
  return value as T;
}
