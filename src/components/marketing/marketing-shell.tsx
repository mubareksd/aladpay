import Link from "next/link";
import type { ReactNode } from "react";
import { btnPrimaryClass, btnSecondaryClass } from "@/lib/ui-classes";

export function MarketingShell({
  children,
  narrow = false,
}: {
  children: ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight text-brand">
            AladPay
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-2 text-sm">
            <Link href="/#product" className="hidden px-2 py-1 text-muted hover:text-foreground sm:inline">
              Product
            </Link>
            <Link href="/login" className="px-2 py-1 text-muted hover:text-foreground">
              Sign in
            </Link>
            <Link
              href="/register"
              className={btnSecondaryClass + " !min-h-9 !w-auto px-3 text-xs sm:text-sm"}
            >
              Register
            </Link>
            <Link href="/app" className={btnPrimaryClass + " !min-h-9 !w-auto px-3 text-xs sm:text-sm"}>
              Open app
            </Link>
          </nav>
        </div>
      </header>

      <div className={`mx-auto w-full flex-1 ${narrow ? "max-w-md" : "max-w-6xl"} px-4 sm:px-6`}>
        {children}
      </div>

      <footer className="mt-auto border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted sm:px-6">
          <p>Ethiopia · ETB · Banks, wallets, verify &amp; restaurant POS</p>
          <div className="flex gap-4">
            <Link href="/app" className="hover:text-foreground">
              App
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
