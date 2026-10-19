"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { InvitePublicView } from "@/lib/auth/invites";
import { btnPrimaryClass, fieldClass, panelClass } from "@/lib/ui-classes";

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [view, setView] = useState<InvitePublicView | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    void fetch(`/api/invites/${token}`)
      .then((r) => r.json())
      .then((data: InvitePublicView) => {
        if (active) setView(data);
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (!view) {
    return <main className="mx-auto max-w-md px-4 py-12 text-sm text-muted">Loading invite…</main>;
  }

  if (!view.valid) {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <div className={`${panelClass} space-y-3 text-sm`}>
          <h1 className="text-lg font-semibold text-foreground">Invite unavailable</h1>
          <p className="text-muted">{view.reason}</p>
          <Link href="/login" className="text-brand hover:underline">
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[80dvh] max-w-md items-center px-4 py-12">
      <form
        className={`${panelClass} w-full space-y-4`}
        onSubmit={(e) => {
          e.preventDefault();
          if (!view.existingUser && password !== confirm) {
            setError("Passwords do not match.");
            return;
          }
          setLoading(true);
          setError(null);
          void (async () => {
            const res = await fetch(`/api/invites/${token}/accept`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({ name: view.existingUser ? undefined : name, password }),
            });
            const data = (await res.json()) as { error?: string };
            if (!res.ok) {
              setError(data.error ?? "Could not join.");
              setLoading(false);
              return;
            }
            router.replace("/");
            router.refresh();
          })();
        }}
      >
        <h1 className="text-lg font-semibold text-foreground">Join {view.companyName}</h1>
        <p className="text-xs text-muted">
          Invited as <span className="font-medium">{view.role}</span> for {view.email}.
        </p>
        {!view.existingUser ? (
          <input
            className={fieldClass}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        ) : null}
        <input
          className={fieldClass}
          type="password"
          placeholder={view.existingUser ? "Your account password" : "Create password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {!view.existingUser ? (
          <input
            className={fieldClass}
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-red-900">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={loading} className={btnPrimaryClass}>
          {loading ? "Joining…" : "Accept invite"}
        </button>
      </form>
    </main>
  );
}
