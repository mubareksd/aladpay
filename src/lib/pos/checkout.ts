import type { AladCheckoutCreateResponse } from "@/lib/alad/types";
import { orderTotal } from "@/lib/pos/order-math";
import type { PosOrder, PosPaymentSettings } from "@/lib/pos/types";

function siteOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin.replace(/\/$/, "");
}

export function paymentSettingsReady(payment: PosPaymentSettings): boolean {
  return Boolean(payment.aladBank.trim() && payment.accountNumber.trim());
}

export async function createOrderCheckoutSession(
  order: PosOrder,
  payment: PosPaymentSettings,
): Promise<AladCheckoutCreateResponse> {
  const origin = siteOrigin();
  const amount = orderTotal(order);
  if (amount <= 0) {
    throw new Error("Add items to the order before accepting payment.");
  }
  if (!paymentSettingsReady(payment)) {
    throw new Error("Configure payment settlement under Orders → Payment setup.");
  }

  const payload = {
    success_url: `${origin}/checkout/success`,
    failure_url: `${origin}/checkout/failure`,
    callback_url: `${origin}/api/alad/webhooks/checkout`,
    nonce: order.id,
    expires_minutes: 15,
    amount,
    metadata: { posOrderId: order.id, table: order.tableLabel },
    settlement_accounts: [
      {
        bank: payment.aladBank.trim(),
        account_number: payment.accountNumber.trim(),
        account_name: payment.accountName.trim() || undefined,
      },
    ],
    items: order.lines.map((line) => ({
      name: line.name,
      quantity: line.quantity,
      price: line.unitPrice,
    })),
  };

  const res = await fetch("/api/alad/checkout/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as AladCheckoutCreateResponse;
  if (!res.ok || data.success === false) {
    throw new Error(data.msg ?? "Could not start checkout.");
  }
  return data;
}
