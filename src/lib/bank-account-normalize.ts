import type { Bank } from "@/lib/ethiopian-bank-qr";

/** Digits-only account for IPS tag 28-02 (max 24). */
export function digitsOnlyAccount(raw: string): string {
  return raw.trim().replace(/\s+/g, "").replace(/\D/g, "");
}

/**
 * Normalize account numbers per institution before building IPS QRs.
 * Awash often displays 15 digits (01 + 13-digit core) while IPS expects the 13-digit core.
 */
export function normalizeIpsBankAccount(bank: Bank, raw: string): string {
  const digits = digitsOnlyAccount(raw);
  if (!digits) return digits;

  if (bank.bic === "AWINETAA") {
    if (digits.length === 15 && digits.startsWith("01")) {
      return digits.slice(2);
    }
    if (digits.length === 14 && digits.startsWith("0")) {
      const withoutLeadingZero = digits.slice(1);
      if (withoutLeadingZero.length === 13) return withoutLeadingZero;
    }
  }

  return digits;
}
