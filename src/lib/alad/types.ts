/** Alad verify response envelope — https://alad.et/agents.md */

export type AladVerifyStatus = "verified" | "invalid" | "pending";

export type AladVerifyData = {
  sender_name?: string;
  sender_account?: string;
  receiver_name?: string;
  receiver_account?: string;
  sent_amount?: string;
  service_charge?: string;
  tax_vat?: string;
  total_paid?: string;
  transfer_date?: string;
  transaction_id?: string;
};

export type AladVerifyConfirmation = {
  confirmed_count?: number;
  first_confirmed_at?: string;
  last_confirmed_at?: string;
};

export type AladSettlementMatch = {
  matched: boolean;
  match_type?: string;
  match_confidence?: string;
};

export type AladAmountMatch = {
  matched: boolean;
  parsed_amount?: number;
  expected_amount?: number;
};

export type AladVerifyResponse = {
  valid: boolean;
  status: AladVerifyStatus;
  bank?: string;
  logo_url?: string;
  cached?: boolean;
  data?: AladVerifyData;
  confirmation?: AladVerifyConfirmation;
  settlement_match?: AladSettlementMatch;
  amount_match?: AladAmountMatch;
  record_id?: string | number;
  error?: string;
};

export type AladVerifyRequestBody = {
  url?: string;
  reference?: string;
  bank?: string;
  /** Sender account (v2). Not settlement. */
  account_number?: string;
  phone?: string;
  settlement_account?: string;
  expected_amount?: number;
};

/** Checkout create response — https://alad.et/agents.md */
export type AladCheckoutSessionData = {
  sessionId: string;
  paymentUrl: string;
  cancelUrl?: string;
  totalAmount?: number;
  currency?: string;
  expires_at?: string;
  token?: string;
};

export type AladCheckoutCreateResponse = {
  error: boolean;
  msg?: string;
  success: boolean;
  data?: AladCheckoutSessionData;
  order_id?: string;
  pay_url?: string;
};

export type AladCheckoutSettlementAccount = {
  bank: string;
  account_number: string;
  account_name?: string;
};

export type AladCheckoutRequestBody = {
  success_url: string;
  failure_url: string;
  callback_url?: string;
  name?: string;
  phone?: string;
  email?: string;
  nonce?: string;
  expires_minutes?: number;
  amount?: number;
  amount_etb?: number;
  settlement_accounts?: AladCheckoutSettlementAccount[];
  items?: { name: string; price: number; quantity?: number }[];
  metadata?: Record<string, unknown>;
};

export type AladCheckoutWebhookBody = {
  sessionId?: string;
  order_id?: string;
  order_number?: string;
  nonce?: string;
  status?: "paid" | "failed" | "cancelled" | "expired";
  amount?: number;
  totalAmount?: number;
  currency?: string;
  payment_method?: string;
  payment_reference?: string;
  failure_reason?: string | null;
  paid_at?: string;
  expires_at?: string;
  customer?: { name?: string; phone?: string; email?: string };
  items?: unknown[];
  metadata?: Record<string, unknown>;
};
