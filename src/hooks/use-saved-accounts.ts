"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getSavedAccountsClientSnapshot,
  getSavedAccountsServerSnapshot,
  publishSavedAccounts,
  subscribeSavedAccounts,
  type SavedAccount,
} from "@/lib/saved-accounts";

export function useSavedAccounts() {
  const accounts = useSyncExternalStore(
    subscribeSavedAccounts,
    getSavedAccountsClientSnapshot,
    getSavedAccountsServerSnapshot,
  );

  const upsert = useCallback((account: SavedAccount) => {
    const next = [
      account,
      ...accounts.filter((item) => item.id !== account.id),
    ].sort((a, b) => b.updatedAt - a.updatedAt);
    publishSavedAccounts(next);
  }, [accounts]);

  const remove = useCallback(
    (id: string) => {
      publishSavedAccounts(accounts.filter((item) => item.id !== id));
    },
    [accounts],
  );

  const mergeImported = useCallback(
    (imported: SavedAccount[]) => {
      const stamped = imported.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        updatedAt: Date.now(),
      }));
      publishSavedAccounts([...stamped, ...accounts].sort((a, b) => b.updatedAt - a.updatedAt));
    },
    [accounts],
  );

  return { accounts, ready: true, upsert, remove, mergeImported };
}
