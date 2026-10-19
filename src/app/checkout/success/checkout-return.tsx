"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function CheckoutSuccessReturn() {
  const params = useSearchParams();
  const sessionId = params.get("sessionId") ?? params.get("order_id");
  const amount = params.get("amount");
  const currency = params.get("currency") ?? "ETB";

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-xl font-semibold text-foreground">Payment received</h1>
      <p className="mt-2 text-sm text-muted">
        Alad checkout reported a successful payment
        {sessionId ? ` for session ${sessionId}` : ""}.
        {amount ? ` Amount: ${amount} ${currency}.` : null}
      </p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">
        Back to AladPay
      </Link>
    </main>
  );
}
