import { Suspense } from "react";
import { GuestOrderRoute } from "@/components/pos/guest-order-route";

export const instant = false;

export default function GuestTablePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-4 py-12 text-sm text-muted">Loading menu…</main>
      }
    >
      <GuestOrderRoute />
    </Suspense>
  );
}
