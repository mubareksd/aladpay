const ALAD_API_BASE = "https://api.alad.et";

export class AladConfigError extends Error {
  constructor() {
    super("ALAD_API_KEY is not configured on the server.");
    this.name = "AladConfigError";
  }
}

export function getAladApiKey(): string {
  const key = process.env.ALAD_API_KEY?.trim();
  if (!key) throw new AladConfigError();
  return key;
}

export function isAladConfigured(): boolean {
  return Boolean(process.env.ALAD_API_KEY?.trim());
}

export type AladFetchResult = {
  status: number;
  body: unknown;
  cacheHeader: string | null;
  retryAfter: string | null;
};

export async function aladPostJson(path: string, body: unknown): Promise<AladFetchResult> {
  const key = getAladApiKey();
  const res = await fetch(`${ALAD_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = { error: "Invalid JSON from Alad API.", raw: text.slice(0, 200) };
    }
  }

  return {
    status: res.status,
    body: parsed,
    cacheHeader: res.headers.get("X-Verify-Cache"),
    retryAfter: res.headers.get("Retry-After"),
  };
}
