"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { panelClass } from "@/lib/ui-classes";

export function CompanyHub() {
  const { session } = useAuth();
  const company = session?.activeCompany;
  if (!company) return null;

  const guestExample =
    typeof window !== "undefined"
      ? `${window.location.origin}/guest/${company.slug}/YOUR_TABLE_ID`
      : `/guest/${company.slug}/YOUR_TABLE_ID`;

  return (
    <div className={`${panelClass} space-y-3 text-sm`}>
      <h2 className="font-medium text-foreground">{company.name}</h2>
      <p className="text-xs text-muted">
        Company slug: <code className="text-foreground">{company.slug}</code>
      </p>
      <ul className="space-y-2 text-xs">
        <li>
          <Link href="/?section=pos" className="text-brand hover:underline">
            Orders & POS
          </Link>
        </li>
        <li>
          <Link href="/kds" className="text-brand hover:underline">
            Kitchen display (KDS)
          </Link>
        </li>
        <li className="text-muted">
          Guest menu path:{" "}
          <code className="break-all text-foreground">{guestExample}</code>
        </li>
      </ul>
    </div>
  );
}
