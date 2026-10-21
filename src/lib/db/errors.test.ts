import { describe, expect, it } from "vitest";
import { isConnectionError, publicDatabaseError } from "@/lib/db/errors";

describe("publicDatabaseError", () => {
  it("maps timeout to 503 without leaking host", () => {
    const err = new Error("connect ETIMEDOUT 91.204.209.39:5432");
    const out = publicDatabaseError(err);
    expect(out.httpStatus).toBe(503);
    expect(out.message).not.toContain("91.204");
  });

  it("detects connection errors", () => {
    expect(isConnectionError(new Error("connect ECONNREFUSED"))).toBe(true);
  });
});
