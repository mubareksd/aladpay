import { describe, expect, it } from "vitest";
import { accountDedupeKey, mergeAccountsDedupe, type SavedAccount } from "@/lib/saved-accounts";

function sample(id: string, bic: string, account: string): SavedAccount {
  return {
    id,
    label: "Test",
    bankBic: bic,
    account,
    name: "Name",
    phone: "",
    till: "",
    city: "ADDIS ABABA",
    encoding: "ips",
    merchantGuid: "",
    updatedAt: 1,
  };
}

describe("mergeAccountsDedupe", () => {
  it("skips imported rows with same bank and account", () => {
    const existing = [sample("1", "ABYSETAA", "146105677")];
    const imported = [sample("2", "ABYSETAA", "146105677")];
    expect(mergeAccountsDedupe(existing, imported)).toHaveLength(1);
    expect(accountDedupeKey(existing[0])).toBe("ABYSETAA:146105677");
  });
});
