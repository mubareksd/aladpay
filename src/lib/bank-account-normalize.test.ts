import { describe, expect, it } from "vitest";
import { BANKS, buildPayload, verifyPayloadCrc } from "@/lib/ethiopian-bank-qr";
import { normalizeIpsBankAccount } from "@/lib/bank-account-normalize";
import { parseEmvQrPayload } from "@/lib/emv-qr-parse";

describe("normalizeIpsBankAccount", () => {
  const awash = BANKS.find((b) => b.bic === "AWINETAA")!;

  it("keeps full Awash account including leading digits", () => {
    expect(normalizeIpsBankAccount(awash, "014251309710700")).toBe("014251309710700");
  });

  it("strips spaces only", () => {
    expect(normalizeIpsBankAccount(awash, "014 251 309710700")).toBe("014251309710700");
  });

  it("builds Awash IPS QR with full 15-digit account in tag 28-02", async () => {
    const payload = await buildPayload({
      bank: awash,
      account: "014251309710700",
      name: "TEST MERCHANT",
      encoding: "ips",
    });
    expect(verifyPayloadCrc(payload).ok).toBe(true);
    const parsed = parseEmvQrPayload(payload);
    expect(parsed.account).toBe("014251309710700");
    expect(parsed.bic).toBe("AWINETAA");
  });
});
