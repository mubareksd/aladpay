import { describe, expect, it } from "vitest";
import { canManageMembers, canRemoveMember } from "@/lib/auth/roles";

describe("roles", () => {
  it("owners and admins manage team", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("employee")).toBe(false);
  });

  it("protects owner from removal", () => {
    expect(canRemoveMember("owner", "owner")).toBe(false);
    expect(canRemoveMember("admin", "employee")).toBe(true);
    expect(canRemoveMember("admin", "admin")).toBe(false);
  });
});
