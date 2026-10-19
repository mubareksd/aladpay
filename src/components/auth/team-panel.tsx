"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { btnPrimaryClass, btnSecondaryClass, fieldClass, panelClass } from "@/lib/ui-classes";
import type { CompanyRole } from "@/lib/auth/types";

type Member = {
  userId: string;
  email: string;
  name: string;
  role: CompanyRole;
  joinedAt: string;
};

const ROLE_LABEL: Record<CompanyRole, string> = {
  owner: "Owner",
  admin: "Admin",
  employee: "Employee",
};

export function TeamPanel() {
  const { session } = useAuth();
  const company = session?.activeCompany;
  const canManage = company?.role === "owner" || company?.role === "admin";

  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"employee" | "admin">("employee");

  const load = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/company/members", { credentials: "same-origin" });
    const data = (await res.json()) as { members?: Member[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not load team.");
      setMembers([]);
    } else {
      setMembers(data.members ?? []);
    }
    setLoading(false);
  }, [canManage]);

  useEffect(() => {
    if (!canManage) return;
    queueMicrotask(() => void load());
  }, [canManage, company?.id, load]);

  if (!company) {
    return (
      <p className={`${panelClass} text-sm text-muted`}>Select a company to view your team.</p>
    );
  }

  if (!canManage) {
    return (
      <div className={`${panelClass} space-y-2 text-sm`}>
        <h2 className="font-medium text-foreground">{company.name}</h2>
        <p className="text-muted">
          You are signed in as {ROLE_LABEL[company.role]}. Contact an owner or admin to add
          colleagues.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4 md:mt-8">
      <div className={`${panelClass} space-y-3`}>
        <h2 className="text-sm font-medium text-foreground">Add employee</h2>
        <p className="text-xs text-muted">
          Create an account for a colleague. They sign in with the email and password you set and
          get access to {company.name}.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className={fieldClass}
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className={fieldClass}
            type="email"
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className={fieldClass}
            type="password"
            placeholder="Temporary password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {company.role === "owner" ? (
            <select
              className={fieldClass}
              value={role}
              onChange={(e) => setRole(e.target.value as "employee" | "admin")}
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          ) : (
            <input className={fieldClass} readOnly value="Employee" aria-label="Role" />
          )}
        </div>
        <button
          type="button"
          className={btnPrimaryClass + " !w-auto px-4"}
          onClick={() => {
            void (async () => {
              setError(null);
              const res = await fetch("/api/company/members", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ name, email, password, role }),
              });
              const data = (await res.json()) as { error?: string };
              if (!res.ok) {
                setError(data.error ?? "Could not add member.");
                return;
              }
              setName("");
              setEmail("");
              setPassword("");
              await load();
            })();
          }}
        >
          Add to team
        </button>
        {error ? (
          <p role="alert" className="text-sm text-red-900">
            {error}
          </p>
        ) : null}
      </div>

      <div className={`${panelClass} space-y-3`}>
        <h2 className="text-sm font-medium text-foreground">Team · {company.name}</h2>
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {members.map((m) => (
              <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium text-foreground">{m.name}</p>
                  <p className="text-xs text-muted">
                    {m.email} · {ROLE_LABEL[m.role]}
                  </p>
                </div>
                {m.role !== "owner" &&
                (company.role === "owner" || (company.role === "admin" && m.role === "employee")) ? (
                  <button
                    type="button"
                    className={btnSecondaryClass + " !min-h-9 text-xs text-red-900"}
                    onClick={() => {
                      void (async () => {
                        const res = await fetch("/api/company/members", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          credentials: "same-origin",
                          body: JSON.stringify({ userId: m.userId }),
                        });
                        if (res.ok) await load();
                      })();
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
