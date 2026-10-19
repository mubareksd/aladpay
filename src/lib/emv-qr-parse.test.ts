import { describe, expect, it } from "vitest";
import { compareParsedPayloads } from "@/lib/payload-compare";
import { parseEmvQrPayload, payloadToFormHints } from "@/lib/emv-qr-parse";
import { loadFixturePayload } from "@/lib/load-fixture";

const CBE_SAMPLE = loadFixturePayload("cbe-birr.txt");
const YAYA_SAMPLE = loadFixturePayload("yaya-sample.txt");

describe("parseEmvQrPayload", () => {
  it("parses CBE Birr sample fields", () => {
    const p = parseEmvQrPayload(CBE_SAMPLE);
    expect(p.bic).toBe("CBEBETAA");
    expect(p.account).toBe("251938158214");
    expect(p.mcc).toBe("4829");
    expect(p.merchantName).toBe("elias weldu rezakum");
    expect(p.crcValid).toBe(true);
  });

  it("parses Yaya sample with lenient tag 62", () => {
    const p = parseEmvQrPayload(YAYA_SAMPLE);
    expect(p.bic).toBe("YAYAETAA");
    expect(p.account).toBe("949909116");
    expect(p.yayaUsername).toBe("mengstabkete");
    expect(p.merchantGuid).toBe("b34762cf0348408bb8710c043a463f29");
    expect(p.amount).toBe("10.24");
  });

  it("maps Yaya payload to form hints", () => {
    const hints = payloadToFormHints(parseEmvQrPayload(YAYA_SAMPLE));
    expect(hints?.bankBic).toBe("YAYAETAA");
    expect(hints?.yayaUsername).toBe("mengstabkete");
    expect(hints?.merchantGuid).toBe("b34762cf0348408bb8710c043a463f29");
    expect(hints?.account).toBe("0949909116");
  });

  it("diffs two parsed payloads", () => {
    const left = parseEmvQrPayload(CBE_SAMPLE);
    const right = parseEmvQrPayload(YAYA_SAMPLE);
    const diff = compareParsedPayloads(left, right);
    expect(diff.some((row) => row.field === "BIC (28-01)" && !row.same)).toBe(true);
  });
});
