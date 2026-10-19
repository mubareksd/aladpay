import { describe, expect, it } from "vitest";
import { AladVerifyValidationError, parseVerifyRequestBody } from "@/lib/alad/verify-request";

describe("parseVerifyRequestBody", () => {
  it("accepts url-only", () => {
    expect(parseVerifyRequestBody({ url: "https://example.com/r/1" })).toEqual({
      url: "https://example.com/r/1",
    });
  });

  it("accepts reference with bank and optional fields", () => {
    expect(
      parseVerifyRequestBody({
        reference: "TB7G9K2P",
        bank: "telebirr",
        settlement_account: "0951410010",
        expected_amount: 100,
        account_number: "1000123456789",
      }),
    ).toEqual({
      reference: "TB7G9K2P",
      bank: "telebirr",
      settlement_account: "0951410010",
      expected_amount: 100,
      account_number: "1000123456789",
    });
  });

  it("rejects both url and reference", () => {
    expect(() =>
      parseVerifyRequestBody({ url: "https://a", reference: "x", bank: "cbe" }),
    ).toThrow(AladVerifyValidationError);
  });

  it("requires bank with reference", () => {
    expect(() => parseVerifyRequestBody({ reference: "FT123" })).toThrow(
      AladVerifyValidationError,
    );
  });
});
