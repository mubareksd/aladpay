import { databaseConfigured, ensureDatabaseSchema, getPool } from "@/lib/db/pool";

export type HealthCheck = {
  key: string;
  label: string;
  status: "ok" | "outage" | "skipped";
  message: string;
  latencyMs: number | null;
};

export type HealthSnapshot = {
  status: "operational" | "degraded" | "outage";
  checkedAt: string;
  checks: HealthCheck[];
};

async function runCheck(
  key: string,
  label: string,
  fn: () => Promise<string>,
): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const message = await fn();
    return { key, label, status: "ok", message, latencyMs: Date.now() - start };
  } catch (e) {
    return {
      key,
      label,
      status: "outage",
      message: e instanceof Error ? e.message : "Failed",
      latencyMs: Date.now() - start,
    };
  }
}

export async function buildHealthSnapshot(): Promise<HealthSnapshot> {
  const checks: HealthCheck[] = [
    await runCheck("app", "Application", async () => "OK"),
  ];

  if (databaseConfigured()) {
    checks.push(
      await runCheck("database", "Database", async () => {
        await ensureDatabaseSchema();
        await getPool().query("SELECT 1");
        return "Connected";
      }),
    );
  } else {
    checks.push({
      key: "database",
      label: "Database",
      status: "skipped",
      message: "DATABASE_URL not set (file mode)",
      latencyMs: null,
    });
  }

  const hasOutage = checks.some((c) => c.status === "outage");
  const status = hasOutage ? "outage" : "operational";

  return {
    status,
    checkedAt: new Date().toISOString(),
    checks,
  };
}
