"use client";

import { useParams } from "next/navigation";
import { GuestOrderPage } from "@/components/pos/guest-order-page";

/** Supports `/guest/{tableId}` (file mode) and `/guest/{companySlug}/{tableId}`. */
export function GuestOrderRoute() {
  const params = useParams();
  const parts = params.parts;
  const segments = Array.isArray(parts) ? parts : typeof parts === "string" ? [parts] : [];

  let companySlug: string | undefined;
  let tableId = "";

  if (segments.length === 1) {
    tableId = segments[0] ?? "";
  } else if (segments.length >= 2) {
    companySlug = segments[0];
    tableId = segments[1] ?? "";
  }

  if (!tableId) {
    return (
      <main className="mx-auto max-w-lg p-6 text-sm text-muted">
        Invalid guest link. Scan the QR on your table again.
      </main>
    );
  }

  return <GuestOrderPage companySlug={companySlug} tableId={tableId} />;
}
