import { tlv } from "@/lib/tlv";
import type { Bank } from "@/lib/ethiopian-bank-qr";
import { walletPhoneDigitsForTlv } from "@/lib/wallets/shared-phone";

export const YAYA_MCC = "0000";

export function yayaLocalPhoneDigits(raw: string): string {
  const full = walletPhoneDigitsForTlv(raw);
  const local = full.slice(3);
  if (!/^9\d{8}$/.test(local)) {
    throw new Error("Yaya Wallet phone must be a valid Ethiopian mobile number.");
  }
  return local;
}

export function formatYayaTag62Phone(localNineDigits: string): string {
  return `+251-${localNineDigits}`;
}

export function normalizeYayaUsername(raw: string | undefined | null): string {
  const trimmed = (raw ?? "").trim().replace(/^@/, "");
  if (!trimmed) return "";
  if (!/^[a-zA-Z0-9._-]{2,32}$/.test(trimmed)) {
    throw new Error(
      "Yaya username must be 2–32 characters (letters, numbers, ., _, -).",
    );
  }
  return trimmed.toLowerCase();
}

export function randomYayaReferenceToken(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
    .join("");
}

export function buildYayaTag62(
  localPhone: string,
  username: string,
  remark: string | null,
  requestId: string,
  referenceToken: string,
): string {
  const payLine = remark?.trim() || `Pay to YAYA:${username}`;
  let additional = "";
  additional += tlv("20", requestId);
  additional += tlv("02", formatYayaTag62Phone(localPhone));
  additional += tlv("04", `YAYA${username}`);
  additional += tlv("07", referenceToken);
  additional += tlv("08", payLine);
  return additional;
}

export type YayaPrepared = {
  account: string;
  city: string;
  merchantCategory: string;
  merchantAccount: string;
  tag62: string;
  username: string;
};

export function prepareYayaWallet(
  bank: Bank,
  rawAccount: string,
  rawCity: string,
  rawCategory: string,
  remark: string | null,
  yayaUsername: string,
  merchantGuid: string,
  requestId: string,
  referenceToken: string,
): YayaPrepared {
  const localPhone = yayaLocalPhoneDigits(rawAccount);
  const username = normalizeYayaUsername(yayaUsername);
  if (!username) {
    throw new Error("Yaya username is required (your handle in the Yaya app, e.g. mengstabkete).");
  }
  if (referenceToken.length !== 12) {
    throw new Error("Yaya reference token must be 12 characters.");
  }
  const merchantCategory =
    !rawCategory.trim() || rawCategory.trim() === "5700" ? YAYA_MCC : rawCategory.trim();
  return {
    account: localPhone,
    city: rawCity.trim(),
    merchantCategory,
    merchantAccount:
      tlv("00", merchantGuid) + tlv("01", bank.bic) + tlv("02", localPhone),
    tag62: buildYayaTag62(localPhone, username, remark, requestId, referenceToken),
    username,
  };
}
