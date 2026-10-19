import { BANKS, crc16CcittFalse, type Bank } from "@/lib/ethiopian-bank-qr";

export type TlvNode = {
  tag: string;
  length: number;
  value: string;
  children?: TlvNode[];
};

export type ParsedEmvQr = {
  payload: string;
  crcValid: boolean;
  crcExpected: string;
  crcCalculated: string;
  tags: TlvNode[];
  pointOfInitiation: string | null;
  merchantGuid: string | null;
  bic: string | null;
  account: string | null;
  mcc: string | null;
  amount: string | null;
  currency: string | null;
  country: string | null;
  merchantName: string | null;
  city: string | null;
  remark: string | null;
  yayaUsername: string | null;
  tag62Phone: string | null;
  bank: Bank | null;
};

export function parseTlvTemplate(value: string): TlvNode[] {
  const nodes: TlvNode[] = [];
  let i = 0;
  while (i + 4 <= value.length) {
    const tag = value.slice(i, i + 2);
    if (!/^\d{2}$/.test(tag)) break;
    const length = parseInt(value.slice(i + 2, i + 4), 10);
    if (Number.isNaN(length)) break;
    i += 4;
    if (i + length > value.length) break;
    const raw = value.slice(i, i + length);
    i += length;
    const nestedTags = new Set(["28", "62", "80"]);
    nodes.push({
      tag,
      length,
      value: raw,
      children: nestedTags.has(tag) ? parseTlvTemplate(raw) : undefined,
    });
  }
  return nodes;
}

/** Parse root EMV payload tags (00–62/80) until tag 63. Tag 62 uses lenient length when apps under-report. */
export function parseTopLevelTags(body: string): TlvNode[] {
  const nodes: TlvNode[] = [];
  let i = 0;
  while (i + 4 <= body.length && body.slice(i, i + 2) !== "63") {
    const tag = body.slice(i, i + 2);
    if (!/^\d{2}$/.test(tag)) break;
    i += 2;
    const len2 = parseInt(body.slice(i, i + 2), 10);
    if (Number.isNaN(len2)) break;
    let length = len2;
    let valueStart = i + 2;
    if (tag === "62" && i + 3 <= body.length) {
      const len3 = parseInt(body.slice(i, i + 3), 10);
      if (len3 >= 100 && valueStart + 1 + len3 <= body.length + 1) {
        const start3 = i + 3;
        if (start3 + len3 <= body.length) {
          length = len3;
          valueStart = start3;
        }
      } else if (valueStart + length < body.length) {
        length = body.length - valueStart;
      }
    }
    if (valueStart + length > body.length) break;
    const raw = body.slice(valueStart, valueStart + length);
    i = valueStart + length;
    const nestedTags = new Set(["28", "62", "80"]);
    nodes.push({
      tag,
      length,
      value: raw,
      children: nestedTags.has(tag) ? parseTlvTemplate(raw) : undefined,
    });
  }
  return nodes;
}

export function parseEmvQrPayload(raw: string): ParsedEmvQr {
  const payload = raw.trim();
  const crcIdx = payload.indexOf("6304");
  if (crcIdx < 0) {
    throw new Error("Payload must include CRC tag 6304.");
  }
  const crcExpected = payload.slice(crcIdx + 4).toUpperCase();
  const body = payload.slice(0, crcIdx + 4);
  const crcCalculated = crc16CcittFalse(new TextEncoder().encode(body))
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  const crcValid = crcExpected.length === 4 && crcExpected === crcCalculated;

  const tags = parseTopLevelTags(payload.slice(0, crcIdx));

  const findTag = (list: TlvNode[], id: string): TlvNode | undefined =>
    list.find((n) => n.tag === id);

  const findSub = (node: TlvNode | undefined, id: string): string | null => {
    if (!node?.children) return null;
    const sub = node.children.find((c) => c.tag === id);
    return sub?.value ?? null;
  };

  const tag28 = findTag(tags, "28");
  const tag62 = findTag(tags, "62");
  const tag80 = findTag(tags, "80");

  const bic = findSub(tag28, "01");
  const account = findSub(tag28, "02");
  const guidOrPhone = findSub(tag28, "00");
  const merchantGuid =
    guidOrPhone && /^[0-9a-f]{32}$/i.test(guidOrPhone) ? guidOrPhone.toLowerCase() : null;

  const tag62Remark = findSub(tag62, "08") ?? findSub(tag62, "03");
  const tag80Remark = tag80?.value ?? null;
  const yayaHandle = findSub(tag62, "04");
  let yayaUsername =
    yayaHandle?.startsWith("YAYA") ? yayaHandle.slice(4).toLowerCase() : null;
  if (!yayaUsername && tag62?.value.includes("YAYA")) {
    const match = tag62.value.match(/YAYA([a-zA-Z0-9._-]{2,32}?)(?=07\d{2}|08\d{2}|6304|$)/);
    yayaUsername = match ? match[1].toLowerCase() : null;
  }

  const bank = bic ? (BANKS.find((b) => b.bic === bic) ?? null) : null;

  return {
    payload,
    crcValid,
    crcExpected,
    crcCalculated,
    tags,
    pointOfInitiation: findTag(tags, "01")?.value ?? null,
    merchantGuid,
    bic,
    account,
    mcc: findTag(tags, "52")?.value ?? null,
    amount: findTag(tags, "54")?.value ?? null,
    currency: findTag(tags, "53")?.value ?? null,
    country: findTag(tags, "58")?.value ?? null,
    merchantName: findTag(tags, "59")?.value ?? null,
    city: findTag(tags, "60")?.value ?? null,
    remark: tag62Remark ?? tag80Remark,
    yayaUsername,
    tag62Phone: findSub(tag62, "02"),
    bank,
  };
}

export type PayloadFormHints = {
  bankBic: string;
  account: string;
  name: string;
  amount: string;
  remark: string;
  city: string;
  merchantGuid: string;
  yayaUsername: string;
  encoding: "ips" | "legacy";
};

export function payloadToFormHints(parsed: ParsedEmvQr): PayloadFormHints | null {
  if (!parsed.bic) return null;
  let account = parsed.account ?? "";
  if (parsed.bank?.walletKind === "yaya" && account && /^9\d{8}$/.test(account)) {
    account = `0${account}`;
  }
  if (parsed.bank?.walletKind === "cbe_birr" && account && /^2519\d{8}$/.test(account)) {
    account = `0${account.slice(3)}`;
  }
  return {
    bankBic: parsed.bic,
    account,
    name: parsed.merchantName ?? "",
    amount: parsed.amount ?? "",
    remark: parsed.remark ?? "",
    city: parsed.city ?? "ADDIS ABABA",
    merchantGuid: parsed.merchantGuid ?? "",
    yayaUsername: parsed.yayaUsername ?? "",
    encoding: "ips",
  };
}
