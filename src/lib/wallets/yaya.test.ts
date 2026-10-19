import { describe, expect, it } from "vitest";
import { parseEmvQrPayload } from "@/lib/emv-qr-parse";
import { BANKS, buildPayload, verifyPayloadCrc } from "@/lib/ethiopian-bank-qr";
import { loadFixturePayload } from "@/lib/load-fixture";

const YAYA_SAMPLE = loadFixturePayload("yaya-sample.txt");

const FIXED = {
  yayaRequestId: "687945bda-5a57-4543-9057-d7d461626a88",
  yayaReferenceToken: "8863D452AA03",
  merchantGuid: "b34762cf0348408bb8710c043a463f29",
};

describe("Yaya wallet regression", () => {
  it("standard encoding includes required markers and valid CRC", async () => {
    const bank = BANKS.find((b) => b.bic === "YAYAETAA")!;
    const payload = await buildPayload({
      bank,
      account: "0949909116",
      name: "Mengstab Ketemaw Abitew",
      city: "Woreda 06, Bole, Addis Ababa",
      amount: "10.24",
      yayaUsername: "mengstabkete",
      encoding: "ips",
      yayaTag62Encoding: "standard",
      ...FIXED,
    });
    expect(verifyPayloadCrc(payload).ok).toBe(true);
    expect(payload).toContain("YAYAETAA");
    expect(payload).toContain("52040000");
    expect(payload).toContain("YAYAmengstabkete");
    expect(payload).toContain("+251-949909116");
    expect(payload).toContain(FIXED.merchantGuid);
    const parsed = parseEmvQrPayload(payload);
    expect(parsed.account).toBe("949909116");
    expect(parsed.pointOfInitiation).toBe("12");
  });

  it("yaya_app encoding uses 6212 prefix and valid CRC", async () => {
    const bank = BANKS.find((b) => b.bic === "YAYAETAA")!;
    const payload = await buildPayload({
      bank,
      account: "0949909116",
      name: "Test",
      city: "Addis Ababa",
      yayaUsername: "testuser",
      yayaTag62Encoding: "yaya_app",
      encoding: "ips",
      ...FIXED,
    });
    expect(payload.includes("6212")).toBe(true);
    expect(verifyPayloadCrc(payload).ok).toBe(true);
  });

  it("fixture sample decodes to expected Yaya identity fields", () => {
    const parsed = parseEmvQrPayload(YAYA_SAMPLE);
    expect(parsed.bic).toBe("YAYAETAA");
    expect(parsed.yayaUsername).toBe("mengstabkete");
    expect(parsed.merchantGuid).toBe(FIXED.merchantGuid);
  });
});
