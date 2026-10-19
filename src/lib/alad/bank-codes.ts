/** Alad institution codes for verify/checkout — see https://alad.et/agents.md */

export type AladBankOption = { code: string; label: string };

export const ALAD_BANK_OPTIONS: readonly AladBankOption[] = [
  { code: "telebirr", label: "Telebirr" },
  { code: "cbe", label: "CBE" },
  { code: "cbebirr", label: "CBE Birr" },
  { code: "boa", label: "Bank of Abyssinia" },
  { code: "mpesa", label: "M-Pesa Ethiopia" },
  { code: "dashen", label: "Dashen" },
  { code: "awash", label: "Awash" },
  { code: "zemen", label: "Zemen" },
  { code: "wegagen", label: "Wegagen" },
  { code: "nib", label: "Nib" },
  { code: "siinqee", label: "Siinqee" },
  { code: "abay", label: "Abay" },
  { code: "amhara", label: "Amhara" },
  { code: "berhan", label: "Berhan" },
  { code: "hibret", label: "Hibret" },
  { code: "oromia", label: "Oromia" },
  { code: "ahadu", label: "Ahadu" },
  { code: "zamzam", label: "ZamZam" },
  { code: "kaafiebirr", label: "Kaafi eBirr" },
  { code: "coopebirr", label: "Coop eBirr" },
  { code: "ebirr", label: "eBirr" },
] as const;

const BIC_TO_ALAD: Record<string, string> = {
  ABYSETAA: "boa",
  CBETETAA: "cbe",
  CBEBETAA: "cbebirr",
  DASHETAA: "dashen",
  AWINETAA: "awash",
  ZEMEETAA: "zemen",
  WEGAETAA: "wegagen",
  NIBIETAA: "nib",
  SINQETAA: "siinqee",
  ABAYETAA: "abay",
  AMHRETAA: "amhara",
  BERHETAA: "berhan",
  UNTDETAA: "hibret",
  ORIRETAA: "oromia",
  AHUUETAA: "ahadu",
  ZAMZETAA: "zamzam",
};

export function bicToAladBank(bic: string): string | null {
  return BIC_TO_ALAD[bic.toUpperCase()] ?? null;
}

export function aladBankLabel(code: string): string {
  const found = ALAD_BANK_OPTIONS.find((b) => b.code === code);
  return found?.label ?? code;
}
