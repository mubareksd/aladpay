import { Suspense } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { BankQrGenerator } from "@/components/bank-qr-generator";

export default function Home() {
  return (
    <main className="min-h-full flex-1">
      <Suspense fallback={<div className="p-6 text-sm text-muted">Loading…</div>}>
        <AuthGate>
          <BankQrGenerator />
        </AuthGate>
      </Suspense>
    </main>
  );
}
