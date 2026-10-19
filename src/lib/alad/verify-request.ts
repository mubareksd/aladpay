import type { AladVerifyRequestBody } from "@/lib/alad/types";

export class AladVerifyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AladVerifyValidationError";
  }
}

function trimOptional(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length ? t : undefined;
}

function parseExpectedAmount(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0) {
    throw new AladVerifyValidationError("expected_amount must be a non-negative number.");
  }
  return n;
}

/** Build POST body for /api/v2/verify (snake_case only). */
export function parseVerifyRequestBody(raw: unknown): AladVerifyRequestBody {
  if (!raw || typeof raw !== "object") {
    throw new AladVerifyValidationError("Request body must be a JSON object.");
  }
  const input = raw as Record<string, unknown>;

  const url = trimOptional(input.url);
  const reference = trimOptional(input.reference);
  const bank = trimOptional(input.bank);
  const account_number = trimOptional(input.account_number);
  const phone = trimOptional(input.phone);
  const settlement_account = trimOptional(input.settlement_account);
  const expected_amount = parseExpectedAmount(input.expected_amount);

  if (url && reference) {
    throw new AladVerifyValidationError("Send either url or reference, not both.");
  }
  if (!url && !reference) {
    throw new AladVerifyValidationError("Provide a receipt url or a reference (+ bank).");
  }
  if (reference && !bank) {
    throw new AladVerifyValidationError("bank is required when verifying by reference.");
  }

  const body: AladVerifyRequestBody = {};
  if (url) body.url = url;
  if (reference) body.reference = reference;
  if (bank) body.bank = bank;
  if (account_number) body.account_number = account_number;
  if (phone) body.phone = phone;
  if (settlement_account) body.settlement_account = settlement_account;
  if (expected_amount !== undefined) body.expected_amount = expected_amount;

  return body;
}
