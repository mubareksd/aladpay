import { describe, expect, it } from "vitest";
import { parseReceiptOcrText } from "@/lib/vision/receipt-parser";

describe("parseReceiptOcrText", () => {
  it("extracts telebirr URL, FT reference, and amount", () => {
    const hints = parseReceiptOcrText([
      "Transaction successful",
      "Amount: 1,250.00 ETB",
      "Reference FT2410ABCD1234",
      "https://transactioninfo.ethiotelecom.et/receipt/abc123",
    ]);
    expect(hints.receiptUrl).toContain("ethiotelecom");
    expect(hints.reference).toBe("FT2410ABCD1234");
    expect(hints.amountEtb).toBe("1250.00");
    expect(hints.aladBank).toBe("telebirr");
  });

  it("finds phone numbers", () => {
    const hints = parseReceiptOcrText(["Sender 0911223344"]);
    expect(hints.phone).toBe("0911223344");
  });
});
