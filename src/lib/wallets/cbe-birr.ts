import { tlv } from "@/lib/tlv";
import type { Bank } from "@/lib/ethiopian-bank-qr";
import { walletPhoneDigitsForTlv } from "@/lib/wallets/shared-phone";

export const CBE_BIRR_MCC = "4829";

function titleCaseCity(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (_, space: string, ch: string) => space + ch.toUpperCase());
}

export function buildCbeBirrMerchantAccountBlock(bank: Bank, phoneDigits: string): string {
  return tlv("00", phoneDigits) + tlv("01", bank.bic) + tlv("02", phoneDigits);
}

export function buildCbeBirrTag62(city: string, remark: string | null): string {
  let additional = "";
  additional += tlv("03", city);
  if (remark) additional += tlv("08", remark);
  additional += tlv("10", "");
  return additional;
}

export type CbeBirrPrepared = {
  account: string;
  city: string;
  merchantCategory: string;
  merchantAccount: string;
  tag62: string;
};

export function prepareCbeBirrWallet(
  bank: Bank,
  rawAccount: string,
  rawCity: string,
  rawCategory: string,
  remark: string | null,
): CbeBirrPrepared {
  const phoneDigits = walletPhoneDigitsForTlv(rawAccount);
  const city = titleCaseCity(rawCity);
  const merchantCategory =
    !rawCategory.trim() || rawCategory.trim() === "5700" ? CBE_BIRR_MCC : rawCategory.trim();
  return {
    account: phoneDigits,
    city,
    merchantCategory,
    merchantAccount: buildCbeBirrMerchantAccountBlock(bank, phoneDigits),
    tag62: buildCbeBirrTag62(city, remark),
  };
}
