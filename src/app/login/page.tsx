"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimaryClass, fieldClass, panelClass } from "@/lib/ui-classes";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main className="mx-auto flex min-h-[80dvh] max-w-md items-center px-4 py-12">
      <form
        className={`${panelClass} w-full space-y-4`}
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setError(null);
          void (async () => {
            const res = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({ email, password }),
            });
            const data = (await res.json()) as { error?: string };
            if (!res.ok) {
              setError(data.error ?? "Sign in failed.");
              setLoading(false);
              return;
            }
            router.replace("/");
            router.refresh();
          })();
        }}
      >
        <h1 className="text-lg font-semibold text-foreground">Sign in</h1>
        <input
          className={fieldClass}
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={fieldClass}
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? (
          <p role="alert" className="text-sm text-red-900">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={loading} className={btnPrimaryClass}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-center text-xs text-muted">
          New here?{" "}
          <Link href="/register" className="text-brand hover:underline">
            Register your company
          </Link>
        </p>
      </form>
    </main>
  );
}
