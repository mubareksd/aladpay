import { describe, expect, it } from "vitest";
import { parseEmvQrPayload } from "@/lib/emv-qr-parse";
import {
  BANKS,
  buildPayload,
  tlv,
  verifyPayloadCrc,
  WALLET_MERCHANT_CATEGORY,
  YAYA_MERCHANT_CATEGORY,
} from "@/lib/ethiopian-bank-qr";
import { loadFixturePayload } from "@/lib/load-fixture";

const CBE_BIRR_SAMPLE = loadFixturePayload("cbe-birr.txt");
const YAYA_SAMPLE = loadFixturePayload("yaya-sample.txt");

describe("tlv", () => {
  it("encodes short tags with two-digit length", () => {
    expect(tlv("59", "Test")).toBe("5904Test");
  });

  it("encodes tag 62 over 99 chars with three-digit length", () => {
    const inner = "x".repeat(100);
    expect(tlv("62", inner)).toBe(`62100${inner}`);
  });
});

describe("CBE Birr golden payload", () => {
  it("matches known working sample", async () => {
    const bank = BANKS.find((b) => b.bic === "CBEBETAA")!;
    const payload = await buildPayload({
      bank,
      account: "251938158214",
      name: "elias weldu rezakum",
      city: "ADDIS ABABA",
      remark: "description",
      encoding: "ips",
    });
    expect(payload).toBe(CBE_BIRR_SAMPLE);
    expect(verifyPayloadCrc(payload).ok).toBe(true);
  });
});

describe("Yaya Wallet structure", () => {
  it("supports yaya_app tag 62 length prefix", async () => {
    const bank = BANKS.find((b) => b.bic === "YAYAETAA")!;
    const payload = await buildPayload({
      bank,
      account: "0949909116",
      name: "Test User",
      city: "Addis Ababa",
      yayaUsername: "testuser",
      yayaRequestId: "687945bda-5a57-4543-9057-d7d461626a88",
      yayaReferenceToken: "8863D452AA03",
      yayaTag62Encoding: "yaya_app",
      encoding: "ips",
    });
    expect(payload.includes("6212")).toBe(true);
    expect(payload.includes("62123")).toBe(false);
    expect(verifyPayloadCrc(payload).ok).toBe(true);
  });

  it("builds IPS layout with deterministic tag 62 fields", async () => {
    const bank = BANKS.find((b) => b.bic === "YAYAETAA")!;
    const payload = await buildPayload({
      bank,
      account: "0949909116",
      name: "Mengstab Ketemaw Abitew",
      city: "Woreda 06, Bole, Addis Ababa",
      amount: "10.24",
      yayaUsername: "mengstabkete",
      merchantGuid: "b34762cf0348408bb8710c043a463f29",
      yayaRequestId: "687945bda-5a57-4543-9057-d7d461626a88",
      yayaReferenceToken: "8863D452AA03",
      encoding: "ips",
    });

    expect(verifyPayloadCrc(payload).ok).toBe(true);
    const parsed = parseEmvQrPayload(payload);
    expect(parsed.bic).toBe("YAYAETAA");
    expect(parsed.account).toBe("949909116");
    expect(parsed.mcc).toBe(YAYA_MERCHANT_CATEGORY);
    expect(parsed.amount).toBe("10.24");
    expect(parsed.merchantGuid).toBe("b34762cf0348408bb8710c043a463f29");
    expect(parsed.yayaUsername).toBe("mengstabkete");
    expect(parsed.pointOfInitiation).toBe("12");
    expect(payload).toContain("YAYAmengstabkete");
    expect(payload).toContain("+251-949909116");
  });

  it("decodes lenient tag 62 from app sample", () => {
    const parsed = parseEmvQrPayload(YAYA_SAMPLE);
    expect(parsed.bic).toBe("YAYAETAA");
    expect(parsed.account).toBe("949909116");
    expect(parsed.yayaUsername).toBe("mengstabkete");
    expect(parsed.mcc).toBe("0000");
  });
});

describe("bank IPS smoke", () => {
  it("produces valid CRC for Abyssinia IPS", async () => {
    const bank = BANKS.find((b) => b.bic === "ABYSETAA")!;
    const payload = await buildPayload({
      bank,
      account: "146105677",
      name: "TEST MERCHANT",
      encoding: "ips",
    });
    expect(verifyPayloadCrc(payload).ok).toBe(true);
    expect(WALLET_MERCHANT_CATEGORY).toBe("4829");
  });
});
