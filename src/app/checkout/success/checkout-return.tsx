"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { markOrderPaidByNonce } from "@/lib/pos/storage";

export function CheckoutSuccessReturn() {
  const params = useSearchParams();
  const sessionId = params.get("sessionId") ?? params.get("order_id");
  const amount = params.get("amount");
  const currency = params.get("currency") ?? "ETB";
  const status = params.get("status");
  const nonce = params.get("nonce");
  const orderUpdated = status === "paid" && Boolean(nonce);

  useEffect(() => {
    if (status === "paid" && nonce) markOrderPaidByNonce(nonce);
  }, [status, nonce]);

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-xl font-semibold text-foreground">Payment received</h1>
      <p className="mt-2 text-sm text-muted">
        Your checkout reported a successful payment
        {sessionId ? ` for session ${sessionId}` : ""}.
        {amount ? ` Amount: ${amount} ${currency}.` : null}
        {orderUpdated ? " Your table order is marked paid." : null}
      </p>
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/app?section=pos" className="font-medium text-brand hover:underline">
          Back to orders
        </Link>
        <Link href="/" className="font-medium text-muted hover:text-foreground">
          Marketing site
        </Link>
      </div>
    </main>
  );
}
