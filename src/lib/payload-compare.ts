import type { ParsedEmvQr } from "@/lib/emv-qr-parse";

export type PayloadFieldDiff = {
  field: string;
  left: string;
  right: string;
  same: boolean;
};

const FIELDS: { key: keyof ParsedEmvQr; label: string }[] = [
  { key: "pointOfInitiation", label: "POI (01)" },
  { key: "bic", label: "BIC (28-01)" },
  { key: "merchantGuid", label: "GUID (28-00)" },
  { key: "account", label: "Account (28-02)" },
  { key: "mcc", label: "MCC (52)" },
  { key: "amount", label: "Amount (54)" },
  { key: "merchantName", label: "Name (59)" },
  { key: "city", label: "City (60)" },
  { key: "yayaUsername", label: "Yaya username" },
  { key: "remark", label: "Remark" },
];

function display(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  return value;
}

export function compareParsedPayloads(
  left: ParsedEmvQr,
  right: ParsedEmvQr,
): PayloadFieldDiff[] {
  const rows: PayloadFieldDiff[] = FIELDS.map(({ key, label }) => {
    const l = display(left[key] as string | null);
    const r = display(right[key] as string | null);
    return { field: label, left: l, right: r, same: l === r };
  });
  rows.push({
    field: "CRC valid",
    left: left.crcValid ? "Yes" : `No (${left.crcCalculated})`,
    right: right.crcValid ? "Yes" : `No (${right.crcCalculated})`,
    same: left.crcValid === right.crcValid && left.crcExpected === right.crcExpected,
  });
  return rows;
}
