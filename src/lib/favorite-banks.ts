const STORAGE_KEY = "aladpay.favoriteBanks.v1";

export function readFavoriteBankBics(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((b): b is string => typeof b === "string" && b.length === 8);
  } catch {
    return [];
  }
}

export function writeFavoriteBankBics(bics: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(bics)]));
}

export function toggleFavoriteBankBic(bic: string): string[] {
  const current = readFavoriteBankBics();
  const next = current.includes(bic)
    ? current.filter((b) => b !== bic)
    : [bic, ...current].slice(0, 8);
  writeFavoriteBankBics(next);
  return next;
}
