import { describe, expect, it } from "vitest";
import { slugifyCompanyName, withUniqueSuffix } from "@/lib/auth/slug";

describe("slugifyCompanyName", () => {
  it("normalizes names", () => {
    expect(slugifyCompanyName("  Addis Cafe  ")).toBe("addis-cafe");
    expect(withUniqueSuffix("addis-cafe", 1)).toBe("addis-cafe-2");
  });
});
