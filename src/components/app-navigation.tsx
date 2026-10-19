"use client";

import Link from "next/link";
import { AuthHeader } from "@/components/auth/auth-header";
import type { AppSection } from "@/lib/app-sections";
import { APP_NAV_ITEMS } from "@/lib/app-sections";

type AppNavigationProps = {
  active: AppSection;
  onChange: (section: AppSection) => void;
};

function NavIcon({ section, active }: { section: AppSection; active: boolean }) {
  const stroke = active ? "var(--brand)" : "var(--muted)";
  const common = { width: 22, height: 22, fill: "none", stroke, strokeWidth: 1.75 };

  switch (section) {
    case "create":
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h7v7h-7z" />
        </svg>
      );
    case "saved":
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M12 17.5 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5z" />
        </svg>
      );
    case "pos":
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M4 6h16M4 12h10M4 18h16" />
          <circle cx="19" cy="12" r="2.5" />
        </svg>
      );
    case "team":
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="10" r="2.5" />
          <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
          <path d="M14 20c0-2 2-3.5 4-3.5" />
        </svg>
      );
    case "verify":
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M9 12.5 11 14.5 15.5 10" />
          <path d="M12 3 4 7v6c0 5 3.5 8.5 8 9.5 4.5-1 8-4.5 8-9.5V7l-8-4z" />
        </svg>
      );
    case "decoder":
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M4 7h16M4 12h10M4 17h14" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      );
    case "banks":
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M3 10h18M5 10V20M9 10V20M15 10V20M19 10V20M2 20h20M12 3l9 5H3l9-5z" />
        </svg>
      );
    default:
      return null;
  }
}

function navButtonClass(active: boolean, layout: "sidebar" | "bottom"): string {
  const base =
    "flex items-center gap-3 text-left text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
  if (layout === "sidebar") {
    return `${base} w-full rounded-md px-3 py-2.5 ${
      active ? "bg-brand-soft text-brand" : "text-muted hover:bg-brand-soft/60 hover:text-foreground"
    }`;
  }
  return `${base} min-w-0 flex-1 flex-col gap-1 px-1 py-2 text-[10px] sm:text-xs ${
    active ? "text-brand" : "text-muted"
  }`;
}

export function AppSidebarNav({ active, onChange }: AppNavigationProps) {
  return (
    <nav
      aria-label="Main"
      className="no-print hidden lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:w-56 lg:shrink-0 lg:flex-col lg:border-r lg:border-border lg:bg-surface lg:pt-[env(safe-area-inset-top,0)] xl:w-60"
    >
      <div className="border-b border-border px-5 py-5 space-y-2">
        <Link href="/" className="text-base font-semibold tracking-wide text-brand hover:opacity-90">
          AladPay
        </Link>
        <AuthHeader />
      </div>
      <ul className="flex flex-1 flex-col gap-0.5 p-3">
        {APP_NAV_ITEMS.map((item) => {
          const isActive = item.id === active;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                data-testid={`nav-${item.id}`}
                className={navButtonClass(isActive, "sidebar")}
              >
                <NavIcon section={item.id} active={isActive} />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppBottomNav({ active, onChange }: AppNavigationProps) {
  return (
    <nav
      aria-label="Main"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom,0)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {APP_NAV_ITEMS.map((item) => {
          const isActive = item.id === active;
          return (
            <li key={item.id} className="flex min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                data-testid={`nav-${item.id}`}
                className={navButtonClass(isActive, "bottom")}
              >
                <NavIcon section={item.id} active={isActive} />
                <span className="truncate">{item.shortLabel}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
