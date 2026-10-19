import { describe, expect, it } from "vitest";
import { BANKS } from "@/lib/ethiopian-bank-qr";
import { normalizeIpsBankAccount } from "@/lib/bank-account-normalize";
import { buildPayload, verifyPayloadCrc } from "@/lib/ethiopian-bank-qr";
import { parseEmvQrPayload } from "@/lib/emv-qr-parse";

describe("normalizeIpsBankAccount", () => {
  const awash = BANKS.find((b) => b.bic === "AWINETAA")!;

  it("strips Awash 01 prefix from 15-digit display account", () => {
    expect(normalizeIpsBankAccount(awash, "014251309710700")).toBe("4251309710700");
  });

  it("builds Awash IPS QR with 13-digit account in tag 28-02", async () => {
    const payload = await buildPayload({
      bank: awash,
      account: "014251309710700",
      name: "TEST MERCHANT",
      encoding: "ips",
    });
    expect(verifyPayloadCrc(payload).ok).toBe(true);
    const parsed = parseEmvQrPayload(payload);
    expect(parsed.account).toBe("4251309710700");
    expect(parsed.bic).toBe("AWINETAA");
  });
});
