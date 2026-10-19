import { expect, test } from "@playwright/test";

test("generates bank QR with valid payload", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("account-input").fill("146105677");
  await page.getByTestId("name-input").fill("Test Merchant");
  await page.getByTestId("generate-qr").click();

  const payload = page.getByTestId("qr-payload");
  await expect(payload).toBeVisible({ timeout: 15_000 });
  const text = await payload.textContent();
  expect(text).toContain("6304");
  expect(text).toContain("ABYSETAA");
});
