"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimaryClass, fieldClass, panelClass } from "@/lib/ui-classes";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
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
            const res = await fetch("/api/auth/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({ name, email, password, companyName }),
            });
            const data = (await res.json()) as { error?: string };
            if (!res.ok) {
              setError(data.error ?? "Registration failed.");
              setLoading(false);
              return;
            }
            router.replace("/?section=team");
            router.refresh();
          })();
        }}
      >
        <h1 className="text-lg font-semibold text-foreground">Register company</h1>
        <p className="text-xs text-muted">
          You become the company owner and can add employees after sign-up.
        </p>
        <input
          className={fieldClass}
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className={fieldClass}
          type="email"
          autoComplete="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={fieldClass}
          type="password"
          autoComplete="new-password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          className={fieldClass}
          placeholder="Company / restaurant name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />
        {error ? (
          <p role="alert" className="text-sm text-red-900">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={loading} className={btnPrimaryClass}>
          {loading ? "Creating account…" : "Create account"}
        </button>
        <p className="text-center text-xs text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
