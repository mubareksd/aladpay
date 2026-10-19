import { describe, expect, it } from "vitest";
import { getFormFieldError } from "@/lib/form-field-errors";
import { defaultPaymentQrForm } from "@/lib/payment-form-state";

describe("getFormFieldError", () => {
  it("requires name when empty", () => {
    expect(getFormFieldError(defaultPaymentQrForm, "name")).toBe("Name is required.");
  });

  it("validates merchant GUID hex length", () => {
    const form = {
      ...defaultPaymentQrForm,
      merchantGuid: "not-hex",
    };
    expect(getFormFieldError(form, "merchantGuid")).toMatch(/32 hex/);
  });

  it("accepts empty merchant GUID", () => {
    const form = { ...defaultPaymentQrForm, merchantGuid: "" };
    expect(getFormFieldError(form, "merchantGuid")).toBeNull();
  });
});
