import { Suspense } from "react";
import { GuestLegacyOrderRoute } from "@/components/pos/guest-order-route";

export const instant = false;

/** File-store dev mode without company slug in the URL. */
export default function GuestLegacyTablePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-4 py-12 text-sm text-muted">Loading menu…</main>
      }
    >
      <GuestLegacyOrderRoute />
    </Suspense>
  );
}
