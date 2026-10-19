import { Suspense } from "react";
import { CheckoutFailureReturn } from "@/app/checkout/failure/checkout-return";

export const instant = false;

export default function CheckoutFailurePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-4 py-12 text-sm text-muted">Loading…</main>
      }
    >
      <CheckoutFailureReturn />
    </Suspense>
  );
}
