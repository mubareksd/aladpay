export type BankAccountType = "bank_account" | "wallet_phone";

export type WalletKind = "cbe_birr" | "yaya";

export type Bank = {
  name: string;
  bic: string;
  bankCode: string;
  /** Wallets use tag 28-02 for the registered phone instead of a bank account. */
  accountType?: BankAccountType;
  walletKind?: WalletKind;
};

export function usesWalletPhone(bank: Bank): boolean {
  return bank.accountType === "wallet_phone";
}

export function getWalletKind(bank: Bank): WalletKind | null {
  if (bank.walletKind) return bank.walletKind;
  if (bank.bic === "YAYAETAA") return "yaya";
  if (bank.bic === "CBEBETAA") return "cbe_birr";
  return null;
}

export function isYayaWallet(bank: Bank): boolean {
  return getWalletKind(bank) === "yaya";
}

export function isCbeBirrWallet(bank: Bank): boolean {
  return getWalletKind(bank) === "cbe_birr";
}

export function getAccountInputMeta(bank: Bank): {
  label: string;
  placeholder: string;
  inputMode: "text" | "tel";
  hint?: string;
} {
  if (isYayaWallet(bank)) {
    return {
      label: "Wallet phone number",
      placeholder: "+251949909116",
      inputMode: "tel",
      hint: "Use the mobile number registered on your Yaya wallet.",
    };
  }
  if (bank.bic === "AWINETAA") {
    return {
      label: "Account number",
      placeholder: "",
      inputMode: "text",
      hint: "Use the 13-digit Awash account. If your statement shows 15 digits starting with 01, omit that prefix.",
    };
  }
  if (isCbeBirrWallet(bank)) {
    return {
      label: "Wallet phone number",
      placeholder: "+251911234567",
      inputMode: "tel",
      hint: "Use the mobile number registered on CBE Birr.",
    };
  }
  if (usesWalletPhone(bank)) {
    return {
      label: "Wallet phone number",
      placeholder: "+251911234567",
      inputMode: "tel",
      hint: `${bank.name} uses your registered mobile number instead of a bank account.`,
    };
  }
  return {
    label: "Account number",
    placeholder: "",
    inputMode: "text",
  };
}

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
  {
    name: "Yaya Wallet",
    bic: "YAYAETAA",
    bankCode: "YAYA",
    accountType: "wallet_phone",
    walletKind: "yaya",
  },
  {
    name: "CBE Birr",
    bic: "CBEBETAA",
    bankCode: "CBEB",
    accountType: "wallet_phone",
    walletKind: "cbe_birr",
  },
] as const;

/** MCC used by CBE Birr wallet QRs in the field (e.g. 4829). */
export const WALLET_MERCHANT_CATEGORY = "4829";

/** MCC on Yaya Wallet request-payment QRs (observed as 0000). */
export const YAYA_MERCHANT_CATEGORY = "0000";

export { CBE_BIRR_MCC } from "@/lib/wallets/cbe-birr";
export { YAYA_MCC } from "@/lib/wallets/yaya";
import { normalizeIpsBankAccount } from "@/lib/bank-account-normalize";
import { prepareCbeBirrWallet } from "@/lib/wallets/cbe-birr";
import {
  prepareYayaWallet,
  randomYayaReferenceToken,
  yayaLocalPhoneDigits,
} from "@/lib/wallets/yaya";

/** How tag 62 is length-prefixed on Yaya Wallet QRs. */
export type YayaTag62Encoding = "standard" | "yaya_app";

import { crc16CcittFalse, tlv, wrapTag62 } from "@/lib/tlv";
import { normalizePhone } from "@/lib/wallets/shared-phone";

export { crc16CcittFalse, tlv, wrapTag62 };

export {
  normalizePhone,
  normalizeWalletPhone,
  walletPhoneDigitsForTlv,
} from "@/lib/wallets/shared-phone";

export {
  formatYayaTag62Phone,
  normalizeYayaUsername,
  yayaLocalPhoneDigits,
} from "@/lib/wallets/yaya";

export function verifyPayloadCrc(payload: string): {
  ok: boolean;
  expected: string;
  calculated: string;
} {
  if (payload.length < 8 || payload.slice(-8, -4) !== "6304") {
    return { ok: false, expected: payload.slice(-4), calculated: "0000" };
  }
  const body = payload.slice(0, -4);
  const expected = payload.slice(-4).toUpperCase();
  const calculated = crc16CcittFalse(new TextEncoder().encode(body))
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return { ok: expected === calculated, expected, calculated };
}

/** NBE tag 80 / EMV 62-08 purpose; max 50 characters. */
export function normalizeRemark(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  const remark = raw.trim();
  if (remark.length > 50) {
    throw new Error("Remark must be at most 50 characters.");
  }
  return remark;
}

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

/** National IPS ET (NBE) vs older single-bank template some apps still accept. */
export type QrEncoding = "ips" | "legacy";

export type BuildPayloadInput = {
  bank: Bank;
  account: string;
  name: string;
  phone?: string | null;
  till?: string | null;
  city?: string;
  merchantCategory?: string;
  amount?: string | null;
  remark?: string | null;
  /** 32 hex chars (UUID without hyphens). Generated from bank + account when omitted. */
  merchantGuid?: string | null;
  encoding?: QrEncoding;
  /** Yaya tag 62-04 / till field; required for Yaya Wallet. */
  yayaUsername?: string | null;
  /** Test hooks for deterministic Yaya tag 62 fields. */
  yayaRequestId?: string | null;
  yayaReferenceToken?: string | null;
  /** Use `yaya_app` if Yaya scanners reject standard 3-digit tag 62 length. */
  yayaTag62Encoding?: YayaTag62Encoding;
};

/** 32 lowercase hex characters for IPS ET tag 28 sub-tag 00. */
export async function deriveMerchantGuid(bic: string, account: string): Promise<string> {
  const data = new TextEncoder().encode(`${bic}:${account.trim()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function normalizeMerchantGuid(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  const guid = raw.trim().replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(guid)) {
    throw new Error("Merchant GUID must be 32 hex characters (UUID without hyphens).");
  }
  return guid;
}

function buildMerchantAccountBlock(
  bank: Bank,
  account: string,
  encoding: QrEncoding,
  merchantGuid: string,
): string {
  if (encoding === "legacy") {
    return tlv("00", bank.bic + "0002246") + tlv("01", bank.bic) + tlv("02", account);
  }
  return tlv("00", merchantGuid) + tlv("01", bank.bic) + tlv("02", account);
}

export async function buildPayload(input: BuildPayloadInput): Promise<string> {
  const {
    bank,
    account: rawAccount,
    name: rawName,
    phone,
    till,
    city: rawCity = "ADDIS ABABA",
    merchantCategory: rawCategory = "5700",
    amount: rawAmount,
    remark: rawRemark,
    merchantGuid: rawMerchantGuid,
    encoding = "ips",
    yayaUsername: rawYayaUsername,
    yayaRequestId: rawYayaRequestId,
    yayaReferenceToken: rawYayaReferenceToken,
    yayaTag62Encoding = "standard",
  } = input;

  const cbeWallet = isCbeBirrWallet(bank);
  const yayaWallet = isYayaWallet(bank);
  const name = rawName.trim();
  let normalizedPhone = normalizePhone(phone);
  const tillValue = cbeWallet || yayaWallet ? "" : (till ?? "").trim();
  let merchantCategory = rawCategory.trim();
  const amount = formatTransactionAmount(rawAmount);
  const remark = normalizeRemark(rawRemark);

  let account = rawAccount.trim();
  let city = rawCity.trim().toUpperCase();
  let merchantAccount: string;
  let includeTag80 = Boolean(remark);
  let tag62Content: string | null = null;

  if (cbeWallet || yayaWallet) {
    if (encoding === "legacy") {
      throw new Error(`Legacy QR format is not supported for ${bank.name}. Use IPS ET.`);
    }
    if (!account) throw new Error("Wallet phone number is required.");
  }

  if (cbeWallet) {
    const prepared = prepareCbeBirrWallet(
      bank,
      account,
      rawCity,
      rawCategory,
      remark,
    );
    account = prepared.account;
    city = prepared.city;
    merchantCategory = prepared.merchantCategory;
    merchantAccount = prepared.merchantAccount;
    tag62Content = prepared.tag62;
    normalizedPhone = "";
    includeTag80 = false;
  } else if (yayaWallet) {
    const requestId = rawYayaRequestId?.trim() || crypto.randomUUID();
    const referenceToken = rawYayaReferenceToken?.trim() || randomYayaReferenceToken();
    const merchantGuid =
      normalizeMerchantGuid(rawMerchantGuid) ??
      (await deriveMerchantGuid(bank.bic, yayaLocalPhoneDigits(account)));
    const prepared = prepareYayaWallet(
      bank,
      account,
      rawCity,
      rawCategory,
      remark,
      rawYayaUsername ?? till ?? "",
      merchantGuid,
      requestId,
      referenceToken,
    );
    account = prepared.account;
    city = prepared.city;
    merchantCategory = prepared.merchantCategory;
    merchantAccount = prepared.merchantAccount;
    tag62Content = prepared.tag62;
    normalizedPhone = "";
    includeTag80 = false;
  } else {
    if (!account) throw new Error("Account number is required.");
    account = normalizeIpsBankAccount(bank, account);
    if (account.length > 24) {
      throw new Error("Account number must be at most 24 characters for IPS ET.");
    }
    const merchantGuid =
      encoding === "ips"
        ? normalizeMerchantGuid(rawMerchantGuid) ??
          (await deriveMerchantGuid(bank.bic, account))
        : "";
    merchantAccount = buildMerchantAccountBlock(bank, account, encoding, merchantGuid);
  }

  if (!name) throw new Error("Recipient/merchant name is required.");
  if (!bank.bic || bank.bic.length !== 8) {
    throw new Error(`Invalid BIC configured for ${bank.name}: ${JSON.stringify(bank.bic)}`);
  }
  if (!/^\d{4}$/.test(merchantCategory)) {
    throw new Error("Merchant category must be exactly four digits.");
  }
  if (account.length > 24) {
    throw new Error("Account identifier must be at most 24 characters for IPS ET.");
  }

  let additional = "";
  if (cbeWallet || yayaWallet) {
    additional = tag62Content ?? "";
  } else {
    if (normalizedPhone) additional += tlv("02", normalizedPhone);
    if (tillValue) additional += tlv("07", tillValue);
    if (remark) additional += tlv("08", remark);
  }

  const pointOfInitiation = amount ? "12" : "11";

  let payload =
    tlv("00", "01") +
    tlv("01", pointOfInitiation) +
    tlv("28", merchantAccount) +
    tlv("52", merchantCategory) +
    tlv("53", "230") +
    (amount ? tlv("54", amount) : "") +
    tlv("58", "ET") +
    tlv("59", name) +
    tlv("60", city);

  if (additional) {
    if (yayaWallet && yayaTag62Encoding === "yaya_app") {
      payload += wrapTag62(additional, { yayaAppCompat: true });
    } else {
      payload += tlv("62", additional);
    }
  }
  if (includeTag80 && remark) payload += tlv("80", remark);

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
