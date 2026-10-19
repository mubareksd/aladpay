export function normalizePhone(phone: string | undefined | null): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  return [...trimmed].filter((ch) => /\d/.test(ch) || ch === "+").join("");
}

export function walletPhoneDigitsForTlv(raw: string): string {
  const compact = normalizePhone(raw).replace(/\s/g, "");
  const digits = compact.startsWith("+") ? compact.slice(1) : compact;
  if (/^2519\d{8}$/.test(digits)) return digits;
  if (/^09\d{8}$/.test(digits)) return `251${digits.slice(1)}`;
  if (/^9\d{8}$/.test(digits)) return `251${digits}`;
  throw new Error(
    "Enter a valid Ethiopian mobile number for the wallet (e.g. +251911234567 or 0911234567).",
  );
}

export function normalizeWalletPhone(raw: string): string {
  return `+${walletPhoneDigitsForTlv(raw)}`;
}
