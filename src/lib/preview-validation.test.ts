import { describe, expect, it } from "vitest";
import { defaultPaymentQrForm } from "@/lib/payment-form-state";
import { BANKS } from "@/lib/ethiopian-bank-qr";
import { getPreviewBlockReason } from "@/lib/preview-validation";

describe("getPreviewBlockReason", () => {
  it("requires account and name", () => {
    expect(getPreviewBlockReason(defaultPaymentQrForm)?.length).toBeGreaterThan(0);
    expect(
      getPreviewBlockReason({
        ...defaultPaymentQrForm,
        account: "146105677",
        name: "Test",
      }),
    ).toBeNull();
  });

  it("requires Yaya username", () => {
    const yaya = BANKS.find((b) => b.bic === "YAYAETAA")!;
    expect(
      getPreviewBlockReason(
        {
          ...defaultPaymentQrForm,
          bankBic: "YAYAETAA",
          account: "0911234567",
          name: "Test",
          yayaUsername: "",
        },
        yaya,
      ),
    ).toMatch(/Yaya username/i);
  });

  it("requires amount in fixed mode", () => {
    expect(
      getPreviewBlockReason({
        ...defaultPaymentQrForm,
        account: "146105677",
        name: "Test",
        amountMode: "fixed",
        amount: "",
      }),
    ).toMatch(/amount/i);
  });
});
