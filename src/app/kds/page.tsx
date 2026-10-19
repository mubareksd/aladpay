import { Suspense } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { KdsDisplay } from "@/components/pos/kds-display";

export default function KdsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Loading kitchen…</div>}>
      <AuthGate>
        <KdsDisplay />
      </AuthGate>
    </Suspense>
  );
}
