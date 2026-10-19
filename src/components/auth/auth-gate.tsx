"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { btnPrimaryClass, panelClass } from "@/lib/ui-classes";

export function AuthGate({ children }: { children: ReactNode }) {
  const { loading, authRequired, session } = useAuth();

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-sm text-muted">
        Loading account…
      </main>
    );
  }

  if (authRequired && !session) {
    return (
      <main className="mx-auto flex min-h-[70dvh] max-w-md items-center px-4 py-12">
        <div className={`${panelClass} w-full space-y-4 text-center`}>
          <h1 className="text-lg font-semibold text-foreground">Sign in to AladPay</h1>
          <p className="text-sm text-muted">
            Your organization uses a shared account. Register your company or sign in to access
            orders, team, and payments.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/login?returnTo=/app" className={btnPrimaryClass}>
              Sign in
            </Link>
            <Link
              href="/register"
              className={btnPrimaryClass + " !bg-surface !text-foreground border border-border"}
            >
              Register company
            </Link>
          </div>
          <Link href="/" className="text-xs text-muted hover:text-foreground">
            ← Back to site
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
