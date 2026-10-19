"use client";

import type { ReactNode } from "react";
import type { AppSection } from "@/lib/app-sections";
import { AuthHeader } from "@/components/auth/auth-header";
import { AppBottomNav, AppSidebarNav } from "@/components/app-navigation";

type AppShellProps = {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  children: ReactNode;
};

export function AppShell({ activeSection, onSectionChange, children }: AppShellProps) {
  return (
    <div className="min-h-full lg:flex">
      <AppSidebarNav active={activeSection} onChange={onSectionChange} />
      <div className="flex min-h-full min-w-0 flex-1 flex-col">
        <div className="no-print border-b border-border bg-surface pt-[env(safe-area-inset-top,0)] lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="text-sm font-semibold tracking-wide text-brand sm:text-base">AladPay</p>
            <AuthHeader />
          </div>
        </div>
        <div className="flex-1 pb-[calc(4.25rem+env(safe-area-inset-bottom,0))] lg:pb-0">
          {children}
        </div>
      </div>
      <AppBottomNav active={activeSection} onChange={onSectionChange} />
    </div>
  );
}
