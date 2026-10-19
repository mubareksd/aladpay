import { Suspense } from "react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <MarketingShell narrow>
      <Suspense fallback={<p className="py-12 text-sm text-muted">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </MarketingShell>
  );
}
