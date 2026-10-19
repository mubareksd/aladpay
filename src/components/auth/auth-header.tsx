"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { btnSecondaryClass, fieldClass } from "@/lib/ui-classes";

export function AuthHeader() {
  const { authRequired, session, logout, switchCompany } = useAuth();

  if (!authRequired) return null;
  if (!session) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Link href="/login" className="text-brand hover:underline">
          Sign in
        </Link>
        <Link href="/register" className="text-muted hover:text-foreground">
          Register
        </Link>
      </div>
    );
  }

  const company = session.activeCompany;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted">
        {session.user.name}
        {company ? ` · ${company.name}` : ""}
      </span>
      {session.companies.length > 1 ? (
        <select
          className={fieldClass + " !min-h-8 max-w-[10rem] py-1 text-xs"}
          value={company?.id ?? ""}
          onChange={(e) => void switchCompany(e.target.value)}
          aria-label="Active company"
        >
          {session.companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      ) : null}
      <button type="button" className={btnSecondaryClass + " !min-h-8 px-2 text-xs"} onClick={() => void logout()}>
        Sign out
      </button>
    </div>
  );
}
