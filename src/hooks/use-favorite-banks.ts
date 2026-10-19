"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  readFavoriteBankBics,
  toggleFavoriteBankBic,
  writeFavoriteBankBics,
} from "@/lib/favorite-banks";

let snapshot: string[] = [];
let serialized: string | null = null;

function syncSnapshot(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem("aladpay.favoriteBanks.v1");
  if (raw === serialized) return snapshot;
  serialized = raw;
  snapshot = readFavoriteBankBics();
  return snapshot;
}

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  syncSnapshot();
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function publish(bics: string[]): void {
  writeFavoriteBankBics(bics);
  serialized = localStorage.getItem("aladpay.favoriteBanks.v1");
  snapshot = bics;
  listeners.forEach((l) => l());
}

export function useFavoriteBanks() {
  const favorites = useSyncExternalStore(subscribe, syncSnapshot, () => []);

  const toggle = useCallback((bic: string) => {
    publish(toggleFavoriteBankBic(bic));
  }, []);

  return { favorites, toggle };
}
