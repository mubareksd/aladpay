"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ALAD_BANK_OPTIONS, aladBankLabel } from "@/lib/alad/bank-codes";
import type {
  AladCheckoutCreateResponse,
  AladVerifyRequestBody,
  AladVerifyResponse,
} from "@/lib/alad/types";
import {
  btnPrimaryClass,
  btnSecondaryClass,
  fieldClass,
  panelClass,
} from "@/lib/ui-classes";

type VerifyMode = "url" | "reference";

export type AladVerifyPanelDefaults = {
  aladBank?: string | null;
  settlementAccount?: string;
  expectedAmount?: string;
  accountName?: string;
  senderAccount?: string;
  walletPhone?: string;
};

type AladVerifyPanelProps = {
  defaults?: AladVerifyPanelDefaults;
};

function siteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin.replace(/\/$/, "");
  return "";
}

export function AladVerifyPanel({ defaults }: AladVerifyPanelProps) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [mode, setMode] = useState<VerifyMode>("reference");
  const [url, setUrl] = useState("");
  const [reference, setReference] = useState("");
  const [bank, setBank] = useState(defaults?.aladBank ?? "telebirr");
  const [accountNumber, setAccountNumber] = useState(defaults?.senderAccount ?? "");
  const [phone, setPhone] = useState(defaults?.walletPhone ?? "");
  const [settlementAccount, setSettlementAccount] = useState(defaults?.settlementAccount ?? "");
  const [expectedAmount, setExpectedAmount] = useState(defaults?.expectedAmount ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AladVerifyResponse | null>(null);
  const [retryAfter, setRetryAfter] = useState<string | null>(null);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutAmount, setCheckoutAmount] = useState(defaults?.expectedAmount ?? "");
  const [checkoutName, setCheckoutName] = useState(defaults?.accountName ?? "");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<AladCheckoutCreateResponse | null>(null);

  useEffect(() => {
    if (defaults?.aladBank) setBank(defaults.aladBank);
    if (defaults?.settlementAccount) setSettlementAccount(defaults.settlementAccount);
    if (defaults?.expectedAmount) {
      setExpectedAmount(defaults.expectedAmount);
      setCheckoutAmount(defaults.expectedAmount);
    }
    if (defaults?.accountName) setCheckoutName(defaults.accountName);
    if (defaults?.senderAccount) setAccountNumber(defaults.senderAccount);
    if (defaults?.walletPhone) setPhone(defaults.walletPhone);
  }, [defaults]);

  useEffect(() => {
    void fetch("/api/alad/verify")
      .then((r) => r.json())
      .then((data: { configured?: boolean }) => setConfigured(Boolean(data.configured)))
      .catch(() => setConfigured(false));
  }, []);

  const needsPhone = bank === "cbebirr" && mode === "reference";
  const needsSenderAccount =
    mode === "reference" && (bank === "cbe" || bank === "boa");

  const verifyPayload = useMemo((): AladVerifyRequestBody => {
    const body: AladVerifyRequestBody = {};
    if (mode === "url") {
      body.url = url.trim();
    } else {
      body.reference = reference.trim();
      body.bank = bank;
    }
    if (accountNumber.trim()) body.account_number = accountNumber.trim();
    if (phone.trim()) body.phone = phone.trim();
    if (settlementAccount.trim()) body.settlement_account = settlementAccount.trim();
    if (expectedAmount.trim()) {
      const n = Number(expectedAmount.trim());
      if (Number.isFinite(n)) body.expected_amount = n;
    }
    return body;
  }, [
    accountNumber,
    bank,
    expectedAmount,
    mode,
    phone,
    reference,
    settlementAccount,
    url,
  ]);

  const runVerify = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setRetryAfter(null);
    try {
      const res = await fetch("/api/alad/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifyPayload),
      });
      const retry = res.headers.get("Retry-After");
      if (retry) setRetryAfter(retry);
      const data = (await res.json()) as AladVerifyResponse & { error?: string; msg?: string };
      if (!res.ok && !data.status) {
        setError(data.error ?? data.msg ?? `Request failed (${res.status}).`);
        return;
      }
      setResult(data);
      if (data.error && !data.valid) setError(data.error);
    } catch {
      setError("Could not reach the verification service.");
    } finally {
      setLoading(false);
    }
  }, [verifyPayload]);

  const runCheckout = useCallback(async () => {
    setCheckoutLoading(true);
    setError(null);
    setCheckoutResult(null);
    const origin = siteOrigin();
    const amount = Number(checkoutAmount.trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid checkout amount.");
      setCheckoutLoading(false);
      return;
    }
    if (!settlementAccount.trim() || !bank) {
      setError("Settlement account and bank are required for checkout.");
      setCheckoutLoading(false);
      return;
    }

    const payload = {
      success_url: `${origin}/checkout/success`,
      failure_url: `${origin}/checkout/failure`,
      callback_url: `${origin}/api/alad/webhooks/checkout`,
      name: checkoutName.trim() || undefined,
      phone: checkoutPhone.trim() || undefined,
      nonce: crypto.randomUUID(),
      amount,
      settlement_accounts: [
        {
          bank,
          account_number: settlementAccount.trim(),
          account_name: checkoutName.trim() || undefined,
        },
      ],
      items: [{ name: "Payment", quantity: 1, price: amount }],
    };

    try {
      const res = await fetch("/api/alad/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as AladCheckoutCreateResponse;
      if (!res.ok || data.success === false) {
        setError(data.msg ?? "Checkout session could not be created.");
        return;
      }
      setCheckoutResult(data);
    } catch {
      setError("Could not create checkout session.");
    } finally {
      setCheckoutLoading(false);
    }
  }, [bank, checkoutAmount, checkoutName, checkoutPhone, settlementAccount]);

  const paymentUrl =
    checkoutResult?.data?.paymentUrl ?? checkoutResult?.pay_url ?? null;

  return (
    <div className={`space-y-4 ${panelClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm text-muted">
          Verify receipts via{" "}
          <a
            href="https://alad.et/docs"
            className="font-medium text-brand hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Alad
          </a>
          . Keys stay on the server; use receipt URL or reference + bank.
        </p>
        {configured === false ? (
          <span className="text-xs text-amber-900" role="status">
            Set <code className="font-mono">ALAD_API_KEY</code> to enable.
          </span>
        ) : null}
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-medium text-muted">Lookup</legend>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={mode === "url"}
            className={
              mode === "url"
                ? btnPrimaryClass + " !min-h-9 w-auto px-4 text-xs"
                : btnSecondaryClass + " !min-h-9 w-auto px-4 text-xs"
            }
            onClick={() => setMode("url")}
          >
            Receipt URL
          </button>
          <button
            type="button"
            aria-pressed={mode === "reference"}
            className={
              mode === "reference"
                ? btnPrimaryClass + " !min-h-9 w-auto px-4 text-xs"
                : btnSecondaryClass + " !min-h-9 w-auto px-4 text-xs"
            }
            onClick={() => setMode("reference")}
          >
            Reference
          </button>
        </div>
      </fieldset>

      {mode === "url" ? (
        <div>
          <label htmlFor="alad-url" className="mb-1 block text-xs font-medium text-muted">
            Receipt URL
          </label>
          <input
            id="alad-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://transactioninfo.ethiotelecom.et/receipt/…"
            className={fieldClass}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="alad-bank" className="mb-1 block text-xs font-medium text-muted">
              Bank
            </label>
            <select
              id="alad-bank"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className={fieldClass}
            >
              {ALAD_BANK_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label} ({opt.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="alad-ref" className="mb-1 block text-xs font-medium text-muted">
              Reference
            </label>
            <input
              id="alad-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={fieldClass}
              data-testid="alad-reference-input"
            />
          </div>
        </>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="alad-sender" className="mb-1 block text-xs font-medium text-muted">
            Sender account_number
            {needsSenderAccount ? " (required)" : " (optional)"}
          </label>
          <input
            id="alad-sender"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className={fieldClass}
            placeholder="Payer account — not your settlement account"
          />
        </div>
        <div>
          <label htmlFor="alad-phone" className="mb-1 block text-xs font-medium text-muted">
            Phone {needsPhone ? "(required for CBE Birr)" : "(optional)"}
          </label>
          <input
            id="alad-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={fieldClass}
            inputMode="tel"
            placeholder="091…"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="alad-settlement" className="mb-1 block text-xs font-medium text-muted">
            Your settlement account (optional)
          </label>
          <input
            id="alad-settlement"
            value={settlementAccount}
            onChange={(e) => setSettlementAccount(e.target.value)}
            className={fieldClass}
            placeholder="Account that should receive funds"
          />
          <p className="mt-1 text-[11px] text-muted">Adds settlement_match when the receipt is valid.</p>
        </div>
        <div>
          <label htmlFor="alad-expected" className="mb-1 block text-xs font-medium text-muted">
            Expected amount ETB (optional)
          </label>
          <input
            id="alad-expected"
            value={expectedAmount}
            onChange={(e) => setExpectedAmount(e.target.value)}
            inputMode="decimal"
            className={fieldClass}
          />
          <p className="mt-1 text-[11px] text-muted">Adds amount_match against sent_amount / total_paid.</p>
        </div>
      </div>

      <button
        type="button"
        disabled={loading || configured === false}
        onClick={() => void runVerify()}
        className={btnPrimaryClass}
        data-testid="alad-verify-submit"
      >
        {loading ? "Verifying…" : "Verify payment"}
      </button>

      {error ? (
        <p role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      {retryAfter ? (
        <p className="text-xs text-muted" role="status">
          Retry-After: {retryAfter}s (upstream may be busy)
        </p>
      ) : null}

      {result ? (
        <div className="border border-border bg-background p-4 text-sm" data-testid="alad-verify-result">
          <p className="font-medium text-foreground">
            {result.valid ? "Valid receipt" : "Not verified"} ·{" "}
            <span className="font-mono text-xs">{result.status}</span>
            {result.bank ? ` · ${aladBankLabel(result.bank)}` : null}
            {result.cached ? " · cached" : null}
          </p>
          {result.data ? (
            <dl className="mt-3 space-y-1.5 text-xs">
              {(
                [
                  ["Sender", result.data.sender_name],
                  ["Sender account", result.data.sender_account],
                  ["Receiver", result.data.receiver_name],
                  ["Receiver account", result.data.receiver_account],
                  ["Sent", result.data.sent_amount],
                  ["Total paid", result.data.total_paid],
                  ["Date", result.data.transfer_date],
                  ["Transaction ID", result.data.transaction_id],
                ] as const
              ).map(([label, value]) =>
                value ? (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="max-w-[65%] text-right text-foreground">{value}</dd>
                  </div>
                ) : null,
              )}
            </dl>
          ) : null}
          {result.settlement_match ? (
            <p className="mt-3 text-xs text-muted">
              Settlement match:{" "}
              <span className={result.settlement_match.matched ? "text-brand" : "text-red-800"}>
                {result.settlement_match.matched ? "yes" : "no"}
              </span>
              {result.settlement_match.match_confidence
                ? ` (${result.settlement_match.match_confidence})`
                : null}
            </p>
          ) : null}
          {result.amount_match ? (
            <p className="mt-1 text-xs text-muted">
              Amount match:{" "}
              <span className={result.amount_match.matched ? "text-brand" : "text-red-800"}>
                {result.amount_match.matched ? "yes" : "no"}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="border-t border-border pt-4">
        <button
          type="button"
          className="text-sm font-medium text-brand hover:underline"
          onClick={() => setCheckoutOpen((v) => !v)}
        >
          {checkoutOpen ? "Hide" : "Show"} Alad checkout (collect payment)
        </button>
        {checkoutOpen ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-muted">
              Creates a hosted session at checkout.alad.et. Customer pays into your settlement
              account; paid status requires a live receipt match.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="checkout-amount" className="mb-1 block text-xs font-medium text-muted">
                  Amount (ETB)
                </label>
                <input
                  id="checkout-amount"
                  value={checkoutAmount}
                  onChange={(e) => setCheckoutAmount(e.target.value)}
                  inputMode="decimal"
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="checkout-name" className="mb-1 block text-xs font-medium text-muted">
                  Customer name (optional)
                </label>
                <input
                  id="checkout-name"
                  value={checkoutName}
                  onChange={(e) => setCheckoutName(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="checkout-phone" className="mb-1 block text-xs font-medium text-muted">
                Customer phone (optional)
              </label>
              <input
                id="checkout-phone"
                value={checkoutPhone}
                onChange={(e) => setCheckoutPhone(e.target.value)}
                className={fieldClass}
                inputMode="tel"
              />
            </div>
            <button
              type="button"
              disabled={checkoutLoading || configured === false}
              onClick={() => void runCheckout()}
              className={btnSecondaryClass}
            >
              {checkoutLoading ? "Creating session…" : "Create checkout session"}
            </button>
            {paymentUrl ? (
              <p className="text-sm">
                <a
                  href={paymentUrl}
                  className="font-medium text-brand hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open payment page
                </a>
                {checkoutResult?.data?.expires_at ? (
                  <span className="mt-1 block text-xs text-muted">
                    Expires {checkoutResult.data.expires_at}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
