"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function CheckoutFailureReturn() {
  const params = useSearchParams();
  const status = params.get("status") ?? "failed";

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-xl font-semibold text-foreground">Payment not completed</h1>
      <p className="mt-2 text-sm text-muted">
        Checkout ended with status <span className="font-mono">{status}</span>. You can try again
        from AladPay or complete payment on the hosted checkout page before it expires.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">
        Back to AladPay
      </Link>
    </main>
  );
}
