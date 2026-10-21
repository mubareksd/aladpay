/** Map driver / network errors to safe API responses (no hostnames or stack traces). */
export function publicDatabaseError(error: unknown): { httpStatus: number; message: string } {
  const msg = error instanceof Error ? error.message : String(error);

  if (/ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENOTFOUND|EHOSTUNREACH|Connection terminated/i.test(msg)) {
    return {
      httpStatus: 503,
      message:
        "Database is unreachable from this deployment. Allow remote MySQL from your host IP, use a cloud database, or run the app on the same server as the database.",
    };
  }

  if (/password authentication failed|Access denied for user|ER_ACCESS_DENIED/i.test(msg)) {
    return {
      httpStatus: 503,
      message: "Database credentials were rejected. Check DATABASE_URL on the server.",
    };
  }

  if (/SSL|certificate/i.test(msg)) {
    return {
      httpStatus: 503,
      message:
        "Database SSL settings mismatch. Try DATABASE_SSL=true in environment variables.",
    };
  }

  return { httpStatus: 400, message: msg.slice(0, 200) };
}

export function isConnectionError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENOTFOUND|EHOSTUNREACH|Connection terminated/i.test(msg);
}
