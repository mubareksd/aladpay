import { Suspense } from "react";
import { CheckoutSuccessReturn } from "@/app/checkout/success/checkout-return";

export const instant = false;

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-4 py-12 text-sm text-muted">Loading…</main>
      }
    >
      <CheckoutSuccessReturn />
    </Suspense>
  );
}
