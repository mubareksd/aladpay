"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { btnPrimaryClass, btnSecondaryClass } from "@/lib/ui-classes";

export function MarketingCta() {
  const { loading, session } = useAuth();

  if (loading) {
    return <div className="h-11 w-48 animate-pulse rounded bg-border" aria-hidden />;
  }

  if (session) {
    return (
      <Link href="/app" className={btnPrimaryClass + " !w-auto px-6 sm:min-w-[10rem]"}>
        Open dashboard
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Link href="/register" className={btnPrimaryClass + " !w-auto px-6 sm:min-w-[10rem]"}>
        Register your company
      </Link>
      <Link
        href="/app"
        className={btnSecondaryClass + " !w-auto px-6 sm:min-w-[10rem]"}
      >
        Try the app
      </Link>
    </div>
  );
}
