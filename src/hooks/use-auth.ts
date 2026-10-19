"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionPayload } from "@/lib/auth/types";

type AuthState = {
  loading: boolean;
  authRequired: boolean;
  session: SessionPayload | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
};

export function useAuth(): AuthState {
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [session, setSession] = useState<SessionPayload | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
    const data = (await res.json()) as { authRequired?: boolean; session?: SessionPayload | null };
    setAuthRequired(Boolean(data.authRequired));
    setSession(data.session ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" })
      .then((res) => res.json())
      .then((data: { authRequired?: boolean; session?: SessionPayload | null }) => {
        if (!active) return;
        setAuthRequired(Boolean(data.authRequired));
        setSession(data.session ?? null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    setSession(null);
  }, []);

  const switchCompany = useCallback(async (companyId: string) => {
    const res = await fetch("/api/auth/company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ companyId }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { session?: SessionPayload };
    if (data.session) setSession(data.session);
  }, []);

  return { loading, authRequired, session, refresh, logout, switchCompany };
}
