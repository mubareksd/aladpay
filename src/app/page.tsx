import { Suspense } from "react";
import { BankQrGenerator } from "@/components/bank-qr-generator";

export default function Home() {
  return (
    <main className="min-h-full flex-1">
      <Suspense fallback={<div className="p-6 text-sm text-muted">Loading…</div>}>
        <BankQrGenerator />
      </Suspense>
    </main>
  );
}
