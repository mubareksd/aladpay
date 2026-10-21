"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ALAD_BANK_OPTIONS, aladBankLabel } from "@/lib/alad/bank-codes";
import type {
  AladCheckoutCreateResponse,
  AladVerifyRequestBody,
  AladVerifyResponse,
} from "@/lib/alad/types";
import { scanReceiptImage } from "@/lib/vision/receipt-client";
import type { ReceiptOcrHints } from "@/lib/vision/types";
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
  const [bank, setBank] = useState(() => defaults?.aladBank ?? "telebirr");
  const [accountNumber, setAccountNumber] = useState(() => defaults?.senderAccount ?? "");
  const [phone, setPhone] = useState(() => defaults?.walletPhone ?? "");
  const [settlementAccount, setSettlementAccount] = useState(
    () => defaults?.settlementAccount ?? "",
  );
  const [expectedAmount, setExpectedAmount] = useState(() => defaults?.expectedAmount ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AladVerifyResponse | null>(null);
  const [retryAfter, setRetryAfter] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrNote, setOcrNote] = useState<string | null>(null);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutAmount, setCheckoutAmount] = useState(() => defaults?.expectedAmount ?? "");
  const [checkoutName, setCheckoutName] = useState(() => defaults?.accountName ?? "");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<AladCheckoutCreateResponse | null>(null);

  useEffect(() => {
    void fetch("/api/alad/status")
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

  const applyReceiptHints = useCallback((hints: ReceiptOcrHints) => {
    if (hints.receiptUrl) {
      setMode("url");
      setUrl(hints.receiptUrl);
    } else if (hints.reference) {
      setMode("reference");
      setReference(hints.reference);
    }
    if (hints.aladBank) setBank(hints.aladBank);
    if (hints.amountEtb) setExpectedAmount(hints.amountEtb);
    if (hints.phone) setPhone(hints.phone);
    setOcrNote("Fields updated from receipt — review before verifying.");
    setError(null);
  }, []);

  const onReceiptImage = useCallback(
    (file: File) => {
      setOcrLoading(true);
      setOcrNote(null);
      setError(null);
      void scanReceiptImage(file)
        .then((hints) => {
          if (
            !hints.receiptUrl &&
            !hints.reference &&
            !hints.amountEtb &&
            !hints.phone
          ) {
            setOcrNote("No reference or link found. Enter details manually or try a clearer screenshot.");
            return;
          }
          applyReceiptHints(hints);
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : "Could not read receipt.");
        })
        .finally(() => setOcrLoading(false));
    },
    [applyReceiptHints],
  );

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
      <p className="text-sm text-muted">
        Confirm an incoming transfer using a receipt link or transaction reference from the payer.
      </p>
      {configured === false ? (
        <p className="text-xs text-amber-900" role="status">
          Verification is not enabled on this deployment.
        </p>
      ) : null}

      <div className="rounded border border-dashed border-border bg-background/60 p-4">
        <p className="text-xs font-medium text-foreground">Receipt screenshot</p>
        <p className="mt-1 text-xs text-muted">
          Upload a payer receipt image to fill reference, link, amount, or phone (Lubaak Vision OCR).
        </p>
        <label className="mt-3 inline-flex cursor-pointer">
          <span className={btnSecondaryClass + " !min-h-9 w-auto px-4 text-xs"}>
            {ocrLoading ? "Reading receipt…" : "Choose image"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={ocrLoading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onReceiptImage(file);
              e.target.value = "";
            }}
          />
        </label>
        {ocrNote ? (
          <p className="mt-2 text-xs text-muted" role="status">
            {ocrNote}
          </p>
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
            placeholder="Receipt link from SMS or bank app"
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
                  {opt.label}
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
            Payer account
            {needsSenderAccount ? " (required)" : " (optional)"}
          </label>
          <input
            id="alad-sender"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className={fieldClass}
            placeholder="Account the payment was sent from"
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
            Your receiving account (optional)
          </label>
          <input
            id="alad-settlement"
            value={settlementAccount}
            onChange={(e) => setSettlementAccount(e.target.value)}
            className={fieldClass}
            placeholder="Account that should receive funds"
          />
          <p className="mt-1 text-[11px] text-muted">Check that funds arrived on this account.</p>
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
          <p className="mt-1 text-[11px] text-muted">Check that the paid amount matches what you expect.</p>
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
          The bank may be busy — try again in a moment.
        </p>
      ) : null}

      {result ? (
        <div className="border border-border bg-background p-4 text-sm" data-testid="alad-verify-result">
          <p className="font-medium text-foreground">
            {result.valid ? "Payment confirmed" : "Could not confirm payment"}
            {result.bank ? ` · ${aladBankLabel(result.bank)}` : null}
          </p>
          {result.data ? (
            <dl className="mt-3 space-y-1.5 text-xs">
              {result.data.sender_name ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">From</dt>
                  <dd className="max-w-[65%] text-right text-foreground">{result.data.sender_name}</dd>
                </div>
              ) : null}
              {result.data.total_paid ?? result.data.sent_amount ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Amount</dt>
                  <dd className="text-foreground">
                    {result.data.total_paid ?? result.data.sent_amount}
                  </dd>
                </div>
              ) : null}
              {result.data.transfer_date ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Date</dt>
                  <dd className="text-foreground">{result.data.transfer_date}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {result.settlement_match ? (
            <p className="mt-3 text-xs text-muted">
              Received on your account:{" "}
              <span className={result.settlement_match.matched ? "text-brand" : "text-red-800"}>
                {result.settlement_match.matched ? "Yes" : "No"}
              </span>
            </p>
          ) : null}
          {result.amount_match ? (
            <p className="mt-1 text-xs text-muted">
              Expected amount:{" "}
              <span className={result.amount_match.matched ? "text-brand" : "text-red-800"}>
                {result.amount_match.matched ? "Matches" : "Does not match"}
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
          {checkoutOpen ? "Hide" : "Show"} hosted checkout link
        </button>
        {checkoutOpen ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-muted">
              Send customers a time-limited page to pay into your account and confirm their
              transfer.
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
