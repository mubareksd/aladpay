import type {
  AladCheckoutRequestBody,
  AladCheckoutSettlementAccount,
} from "@/lib/alad/types";

export class AladCheckoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AladCheckoutValidationError";
  }
}

function trimRequired(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AladCheckoutValidationError(`${field} is required.`);
  }
  return value.trim();
}

function trimOptional(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length ? t : undefined;
}

function parseSettlementAccounts(raw: unknown): AladCheckoutSettlementAccount[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new AladCheckoutValidationError("settlement_accounts must be a non-empty array.");
  }
  return raw.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new AladCheckoutValidationError(`settlement_accounts[${index}] must be an object.`);
    }
    const row = item as Record<string, unknown>;
    const bank = trimOptional(row.bank) ?? trimOptional(row.provider);
    const account_number =
      trimOptional(row.account_number) ?? trimOptional(row.account);
    if (!bank || !account_number) {
      throw new AladCheckoutValidationError(
        `settlement_accounts[${index}] needs bank and account_number.`,
      );
    }
    const account_name =
      trimOptional(row.account_name) ?? trimOptional(row.name) ?? trimOptional(row.label);
    return {
      bank,
      account_number,
      ...(account_name ? { account_name } : {}),
    };
  });
}

export function parseCheckoutRequestBody(raw: unknown): AladCheckoutRequestBody {
  if (!raw || typeof raw !== "object") {
    throw new AladCheckoutValidationError("Request body must be a JSON object.");
  }
  const input = raw as Record<string, unknown>;

  const success_url = trimRequired(input.success_url, "success_url");
  const failure_url = trimRequired(input.failure_url, "failure_url");
  const callback_url = trimOptional(input.callback_url);

  const body: AladCheckoutRequestBody = { success_url, failure_url };
  if (callback_url) body.callback_url = callback_url;

  const name = trimOptional(input.name);
  const phone = trimOptional(input.phone);
  const email = trimOptional(input.email);
  const nonce = trimOptional(input.nonce);
  if (name) body.name = name;
  if (phone) body.phone = phone;
  if (email) body.email = email;
  if (nonce) body.nonce = nonce;

  if (input.expires_minutes !== undefined && input.expires_minutes !== null) {
    const n = Number(input.expires_minutes);
    if (!Number.isFinite(n)) {
      throw new AladCheckoutValidationError("expires_minutes must be a number.");
    }
    body.expires_minutes = n;
  }

  if (input.amount !== undefined && input.amount !== null && input.amount !== "") {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount)) {
      throw new AladCheckoutValidationError("amount must be a number.");
    }
    body.amount = amount;
  } else if (input.amount_etb !== undefined && input.amount_etb !== null) {
    const amount = Number(input.amount_etb);
    if (!Number.isFinite(amount)) {
      throw new AladCheckoutValidationError("amount_etb must be a number.");
    }
    body.amount_etb = amount;
  }

  const settlement_accounts = parseSettlementAccounts(input.settlement_accounts);
  if (settlement_accounts) body.settlement_accounts = settlement_accounts;

  if (Array.isArray(input.items) && input.items.length > 0) {
    body.items = input.items.map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new AladCheckoutValidationError(`items[${index}] must be an object.`);
      }
      const row = item as Record<string, unknown>;
      const nameItem = trimRequired(row.name, `items[${index}].name`);
      const price = Number(row.price);
      if (!Number.isFinite(price)) {
        throw new AladCheckoutValidationError(`items[${index}].price must be a number.`);
      }
      const quantity =
        row.quantity === undefined ? 1 : Number(row.quantity);
      if (!Number.isFinite(quantity) || quantity < 1) {
        throw new AladCheckoutValidationError(`items[${index}].quantity must be at least 1.`);
      }
      return { name: nameItem, price, quantity };
    });
  }

  if (!body.amount && !body.amount_etb && (!body.items || body.items.length === 0)) {
    throw new AladCheckoutValidationError(
      "Provide amount, amount_etb, or items for checkout.",
    );
  }

  return body;
}
