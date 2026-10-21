import type { ReceiptOcrHints } from "@/lib/vision/types";

const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi;
const FT_REF_RE = /\bFT[A-Z0-9]{8,}\b/i;
const GENERIC_REF_RE = /\b(?:ref(?:erence)?|txn|transaction\s*id|receipt\s*no)[:\s#-]*([A-Z0-9]{6,24})\b/i;
const AMOUNT_RE =
  /(?:ETB|Birr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)|([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:ETB|Birr)/gi;
const PHONE_RE = /(?:\+251|251|0)?(9\d{8})\b/;

function normalizeAmount(raw: string): string {
  return raw.replace(/,/g, "");
}

function guessBankFromUrl(url: string): string | undefined {
  const lower = url.toLowerCase();
  if (lower.includes("telebirr") || lower.includes("ethiotelecom")) return "telebirr";
  if (lower.includes("cbebirr") || lower.includes("cbe-birr")) return "cbebirr";
  if (lower.includes("cbe.com") || lower.includes("commercialbank")) return "cbe";
  if (lower.includes("mpesa")) return "mpesa";
  if (lower.includes("dashen")) return "dashen";
  if (lower.includes("awash")) return "awash";
  if (lower.includes("abyssinia") || lower.includes("bankofabyssinia")) return "boa";
  return undefined;
}

function collectText(lines: string[]): string {
  return lines.join("\n");
}

export function parseReceiptOcrText(lines: string[]): ReceiptOcrHints {
  const text = collectText(lines);
  const hints: ReceiptOcrHints = {};

  const urls = text.match(URL_RE);
  if (urls?.[0]) {
    hints.receiptUrl = urls[0].replace(/[.,;]+$/, "");
    hints.aladBank = guessBankFromUrl(hints.receiptUrl) ?? hints.aladBank;
  }

  const ft = text.match(FT_REF_RE);
  if (ft?.[0]) {
    hints.reference = ft[0].toUpperCase();
  } else {
    const generic = GENERIC_REF_RE.exec(text);
    if (generic?.[1]) hints.reference = generic[1].toUpperCase();
  }

  let amountMatch: RegExpExecArray | null;
  AMOUNT_RE.lastIndex = 0;
  let bestAmount: string | undefined;
  while ((amountMatch = AMOUNT_RE.exec(text)) !== null) {
    const val = amountMatch[1] ?? amountMatch[2];
    if (val) bestAmount = normalizeAmount(val);
  }
  if (bestAmount) hints.amountEtb = bestAmount;

  const phone = PHONE_RE.exec(text.replace(/\s/g, ""));
  if (phone?.[1]) hints.phone = phone[1].startsWith("0") ? phone[1] : `0${phone[1]}`;

  if (!hints.aladBank && hints.reference && !hints.receiptUrl) {
    hints.aladBank = "telebirr";
  }

  return hints;
}

export function mergeOcrLines(result: {
  raw_text_lines?: string[];
  lines?: { text: string }[];
}): string[] {
  const fromRaw = result.raw_text_lines ?? [];
  const fromLines = (result.lines ?? []).map((l) => l.text).filter(Boolean);
  const merged = [...fromRaw, ...fromLines];
  return [...new Set(merged.map((s) => s.trim()).filter(Boolean))];
}
