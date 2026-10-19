# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> generates bank QR with valid payload
- Location: e2e\smoke.spec.ts:3:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('qr-payload')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByTestId('qr-payload') with timeout 15000ms
  - waiting for getByTestId('qr-payload')

```

```yaml
- main:
  - paragraph: AladPay
  - paragraph: Ethiopia · ETB
  - heading "Bank payment QR" [level=1]
  - paragraph: Static QR for receiving money. Amount is optional. Scan with the payer's bank app to confirm it works before you rely on it.
  - heading "Saved accounts" [level=2]
  - paragraph: Stored only in this browser. Merge import skips duplicate bank + account rows.
  - paragraph: Fill in the form below, then save an account to reuse it here.
  - text: Label when saving
  - textbox "Label when saving":
    - /placeholder: e.g. Shop till, personal account
  - button "Save account"
  - button "Export backup" [disabled]
  - text: "Import:"
  - combobox "Import:":
    - option "Merge with existing" [selected]
    - option "Replace all"
  - button "Import backup"
  - button "Choose File"
  - text: Shortcut amount (ETB)
  - textbox "Shortcut amount (ETB)":
    - /placeholder: e.g. 500
  - paragraph: "\"QR with amount\" uses this value plus the remark field in the main form."
  - button "Decode QR or payloadOpen"
  - text: Bank
  - button "Bank": Bank of AbyssiniaABYSETAA
  - paragraph: Some Abyssinia QRs use legacy encoding. Try legacy if IPS fails.
  - text: Account number
  - textbox "Account number":
    - /placeholder: ""
  - text: Name on account
  - textbox "Name on account"
  - group "Amount mode":
    - text: Amount mode
    - button "Any amount"
    - button "Fixed amount"
  - text: Remark or reason
  - textbox "Remark or reason":
    - /placeholder: e.g. Rent for March
  - paragraph: Shown to the payer when supported (NBE context tag 80 and purpose in tag 62).
  - text: Phone
  - textbox "Phone":
    - /placeholder: "+251"
  - text: Till number
  - textbox "Till number"
  - text: City
  - textbox "City": ADDIS ABABA
  - text: QR standard
  - combobox "QR standard":
    - option "IPS ET (national interoperable)" [selected]
    - option "Legacy (BIC + 0002246 prefix)"
  - text: Merchant GUID (optional)
  - textbox "Merchant GUID (optional)":
    - /placeholder: 32 hex chars from your bank, or leave blank
  - checkbox "Update preview while typing" [checked]
  - text: Update preview while typing
  - button "Refresh open amount QR"
  - button "Create QR"
  - complementary:
    - paragraph: Bank of Abyssinia
    - paragraph: ABYSETAA
    - paragraph: Preview
    - paragraph: No QR yet.
    - status: "Preview waiting: Enter the account number."
  - button "All banks (34)Open list"
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | test("generates bank QR with valid payload", async ({ page }) => {
  4  |   await page.goto("/");
  5  | 
  6  |   await page.getByTestId("account-input").fill("146105677");
  7  |   await page.getByTestId("name-input").fill("Test Merchant");
  8  |   await page.getByTestId("generate-qr").click();
  9  | 
  10 |   const payload = page.getByTestId("qr-payload");
> 11 |   await expect(payload).toBeVisible({ timeout: 15_000 });
     |                         ^ Error: expect(locator).toBeVisible() failed
  12 |   const text = await payload.textContent();
  13 |   expect(text).toContain("6304");
  14 |   expect(text).toContain("ABYSETAA");
  15 | });
  16 | 
```