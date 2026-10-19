export type Bank = {
  name: string;
  bic: string;
  bankCode: string;
};

export const BANKS: readonly Bank[] = [
  { name: "Siket Bank S.C", bic: "SSHCETAA", bankCode: "143" },
  { name: "Rammis Bank S.C.", bic: "RMSIETAA", bankCode: "16" },
  { name: "Sidama Bank S.C.", bic: "SDMAETAA", bankCode: "22" },
  { name: "Omo Bank S.C.", bic: "OSCOETAA", bankCode: "239" },
  { name: "Gadaa Bank S.C.", bic: "GDAAETAA", bankCode: "60" },
  { name: "Amhara Bank S.C.", bic: "AMHRETAA", bankCode: "276" },
  { name: "Tsehay Bank S.C.", bic: "TSCPETAA", bankCode: "77" },
  { name: "Tsedey Bank S.C.", bic: "TSDYETAA", bankCode: "559" },
  { name: "Siinqee Bank S.C.", bic: "SINQETAA", bankCode: "493" },
  { name: "Ahadu Bank S.C.", bic: "AHUUETAA", bankCode: "76" },
  { name: "Hijra Bank S.C.", bic: "HIJRETAA", bankCode: "71" },
  { name: "Goh Betoch Bank S.C.", bic: "GOBTETAA", bankCode: "9" },
  { name: "Shabelle Bank S.C.", bic: "SBEEETAA", bankCode: "52" },
  { name: "ZamZam Bank S.C.", bic: "ZAMZETAA", bankCode: "75" },
  { name: "Global Bank S.C", bic: "DEGAETAA", bankCode: "152" },
  { name: "Enat Bank S.C.", bic: "ENATETAA", bankCode: "153" },
  { name: "Addis Bank S.C", bic: "ABSCETAA", bankCode: "133" },
  { name: "Abay Bank S.C.", bic: "ABAYETAA", bankCode: "483" },
  { name: "Berhan Bank S.C.", bic: "BERHETAA", bankCode: "369" },
  { name: "Bunna Bank S.C", bic: "BUNAETAA", bankCode: "466" },
  { name: "Zemen Bank S.C.", bic: "ZEMEETAA", bankCode: "102" },
  { name: "Oromia Bank S.C.", bic: "ORIRETAA", bankCode: "501" },
  { name: "Anbesa Bank", bic: "LIBSETAA", bankCode: "288" },
  { name: "Cooperative Bank of Oromia", bic: "CBORETAA", bankCode: "740" },
  { name: "Nib Int. Bank S.C.", bic: "NIBIETAA", bankCode: "441" },
  { name: "Hibret Bank S.C.", bic: "UNTDETAA", bankCode: "469" },
  { name: "Wegagen Bank S.C.", bic: "WEGAETAA", bankCode: "411" },
  { name: "Bank of Abyssinia", bic: "ABYSETAA", bankCode: "848" },
  { name: "Dashen Bank S.C.", bic: "DASHETAA", bankCode: "835" },
  { name: "Awash Bank S.C.", bic: "AWINETAA", bankCode: "878" },
  { name: "Commercial Bank of Ethiopia", bic: "CBETETAA", bankCode: "1936" },
  { name: "Development Bank of Ethiopia", bic: "DEETETAA", bankCode: "100" },
] as const;

export function tlv(tag: string, value: string): string {
  if (tag.length !== 2 || !/^\d{2}$/.test(tag)) {
    throw new Error(`Invalid TLV tag: ${JSON.stringify(tag)}`);
  }
  const length = value.length;
  if (length > 99) {
    throw new Error(`Value for tag ${tag} is too long (${length} characters)`);
  }
  return `${tag}${length.toString().padStart(2, "0")}${value}`;
}

export function crc16CcittFalse(data: Uint8Array): number {
  let crc = 0xffff;
  for (const byte of data) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc;
}

export function normalizePhone(phone: string | undefined | null): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  return [...trimmed].filter((ch) => /\d/.test(ch) || ch === "+").join("");
}

/** EMV QR tag 54. Omit when empty; value is a positive amount string (max 13 chars). */
export function formatTransactionAmount(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  const normalized = raw.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Amount must be a positive number with up to two decimal places.");
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Amount must be greater than zero.");
  }
  const [whole, frac = ""] = normalized.split(".");
  const trimmedFrac = frac.replace(/0+$/, "");
  const formatted = trimmedFrac ? `${whole}.${trimmedFrac}` : whole;
  if (formatted.length > 13) {
    throw new Error("Amount is too long for EMV tag 54 (max 13 characters).");
  }
  return formatted;
}

export type BuildPayloadInput = {
  bank: Bank;
  account: string;
  name: string;
  phone?: string | null;
  till?: string | null;
  city?: string;
  merchantCategory?: string;
  amount?: string | null;
};

export function buildPayload(input: BuildPayloadInput): string {
  const {
    bank,
    account: rawAccount,
    name: rawName,
    phone,
    till,
    city: rawCity = "ADDIS ABABA",
    merchantCategory: rawCategory = "5700",
    amount: rawAmount,
  } = input;

  const account = rawAccount.trim();
  const name = rawName.trim();
  const normalizedPhone = normalizePhone(phone);
  const tillValue = (till ?? "").trim();
  const city = rawCity.trim().toUpperCase();
  const merchantCategory = rawCategory.trim();
  const amount = formatTransactionAmount(rawAmount);

  if (!account) throw new Error("Account number is required.");
  if (!name) throw new Error("Recipient/merchant name is required.");
  if (!bank.bic || bank.bic.length !== 8) {
    throw new Error(`Invalid BIC configured for ${bank.name}: ${JSON.stringify(bank.bic)}`);
  }
  if (!/^\d{4}$/.test(merchantCategory)) {
    throw new Error("Merchant category must be exactly four digits.");
  }

  const merchantAccount =
    tlv("00", bank.bic + "0002246") + tlv("01", bank.bic) + tlv("02", account);

  let additional = "";
  if (normalizedPhone) additional += tlv("02", normalizedPhone);
  if (tillValue) additional += tlv("07", tillValue);

  let payload =
    tlv("00", "01") +
    tlv("01", "11") +
    tlv("28", merchantAccount) +
    tlv("52", merchantCategory) +
    tlv("53", "230") +
    (amount ? tlv("54", amount) : "") +
    tlv("58", "ET") +
    tlv("59", name) +
    tlv("60", city);

  if (additional) payload += tlv("62", additional);

  const crcInput = new TextEncoder().encode(payload + "6304");
  payload += "6304" + crc16CcittFalse(crcInput).toString(16).toUpperCase().padStart(4, "0");
  return payload;
}

export function findBank(query: string): Bank {
  const q = query.trim().toLowerCase();
  const exact = BANKS.filter(
    (b) => b.name.toLowerCase() === q || b.bic.toLowerCase() === q,
  );
  if (exact.length === 1) return exact[0];

  const matches = BANKS.filter(
    (b) => b.name.toLowerCase().includes(q) || b.bic.toLowerCase().includes(q),
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    const names = matches.map((b) => `  - ${b.name} (${b.bic})`).join("\n");
    throw new Error(`Bank name is ambiguous. Matches:\n${names}`);
  }
  throw new Error(`Bank not found: ${JSON.stringify(query)}. See the bank list for supported banks.`);
}
