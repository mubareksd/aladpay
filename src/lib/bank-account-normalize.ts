import type { Bank } from "@/lib/ethiopian-bank-qr";

/** Digits-only account for IPS tag 28-02 (max 24). Preserves full length (e.g. Awash 014251309710700). */
export function normalizeIpsBankAccount(_bank: Bank, raw: string): string {
  return raw.trim().replace(/\s+/g, "").replace(/\D/g, "");
}

export function digitsOnlyAccount(raw: string): string {
  return normalizeIpsBankAccount({ name: "", bic: "", bankCode: "" }, raw);
}
