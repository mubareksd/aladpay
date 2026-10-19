"use client";

import QRCode from "qrcode";
import { useCallback, useMemo, useState } from "react";
import { BankLogo } from "@/components/bank-logo";
import { ChevronDown } from "@/components/chevron-down";
import {
  BANKS,
  buildPayload,
  formatTransactionAmount,
  type Bank,
} from "@/lib/ethiopian-bank-qr";

const fieldClass =
  "w-full rounded border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand";

type FormState = {
  bankBic: string;
  account: string;
  name: string;
  amount: string;
  phone: string;
  till: string;
  city: string;
};

const defaultForm: FormState = {
  bankBic: "ABYSETAA",
  account: "",
  name: "",
  amount: "",
  phone: "",
  till: "",
  city: "ADDIS ABABA",
};

export function BankQrGenerator() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [amountInQr, setAmountInQr] = useState<string | null>(null);
  const [showBankList, setShowBankList] = useState(false);
  const [bankFilter, setBankFilter] = useState("");
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankPickerQuery, setBankPickerQuery] = useState("");

  const selectedBankOption = useMemo(
    () => BANKS.find((b) => b.bic === form.bankBic),
    [form.bankBic],
  );

  const pickerBanks = useMemo(() => {
    const q = bankPickerQuery.trim().toLowerCase();
    if (!q) return [...BANKS];
    return BANKS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.bic.toLowerCase().includes(q) ||
        b.bankCode.includes(q),
    );
  }, [bankPickerQuery]);

  const filteredBanks = useMemo(() => {
    const q = bankFilter.trim().toLowerCase();
    if (!q) return [...BANKS];
    return BANKS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.bic.toLowerCase().includes(q) ||
        b.bankCode.includes(q),
    );
  }, [bankFilter]);

  const updateField = useCallback((key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  const generate = useCallback(async () => {
    setError(null);
    setPayload(null);
    setQrDataUrl(null);
    setSelectedBank(null);
    setAmountInQr(null);

    const bank = BANKS.find((b) => b.bic === form.bankBic);
    if (!bank) {
      setError("Pick a bank first.");
      return;
    }

    try {
      const nextPayload = buildPayload({
        bank,
        account: form.account,
        name: form.name,
        phone: form.phone || undefined,
        till: form.till || undefined,
        city: form.city,
        amount: form.amount || undefined,
      });
      const dataUrl = await QRCode.toDataURL(nextPayload, {
        errorCorrectionLevel: "M",
        margin: 4,
        width: 300,
        color: { dark: "#1a1814", light: "#fffcf7" },
      });
      setPayload(nextPayload);
      setQrDataUrl(dataUrl);
      setSelectedBank(bank);
      const formattedAmount = formatTransactionAmount(form.amount || undefined);
      setAmountInQr(formattedAmount ? `${formattedAmount} ETB` : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the QR.");
    }
  }, [form]);

  const downloadPng = useCallback(() => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = "bank_qr.png";
    link.click();
  }, [qrDataUrl]);

  const copyPayload = useCallback(async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      setError("Clipboard access failed.");
    }
  }, [payload]);

  return (
    <div className="min-h-full">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-4 px-4 py-4 sm:px-6">
          <p className="text-sm font-semibold tracking-wide text-brand">AladPay</p>
          <p className="text-xs text-muted">Ethiopia · ETB</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="max-w-xl">
          <h1 className="text-2xl font-semibold text-foreground sm:text-[1.65rem]">
            Bank payment QR
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Static QR for receiving money. Amount is optional. Scan with the payer&apos;s bank app
            to confirm it works before you rely on it.
          </p>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,360px)] lg:gap-8">
          <form
            className="space-y-4 border border-border bg-surface p-5 sm:p-6"
            onSubmit={(e) => {
              e.preventDefault();
              void generate();
            }}
          >
            <div>
              <label id="bank-label" className="mb-1 block text-xs font-medium text-muted">
                Bank
              </label>
              <input type="hidden" name="bankBic" value={form.bankBic} readOnly />
              <button
                type="button"
                aria-labelledby="bank-label"
                aria-expanded={bankPickerOpen}
                onClick={() => setBankPickerOpen((open) => !open)}
                className="flex w-full items-center gap-3 rounded border border-border bg-background px-3 py-2.5 text-left text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                {selectedBankOption ? (
                  <>
                    <BankLogo
                      bic={selectedBankOption.bic}
                      name={selectedBankOption.name}
                      size="md"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">
                        {selectedBankOption.name}
                      </span>
                      <span className="block font-mono text-[11px] text-muted">
                        {selectedBankOption.bic}
                      </span>
                    </span>
                  </>
                ) : null}
                <ChevronDown open={bankPickerOpen} />
              </button>
              {bankPickerOpen ? (
                <div className="mt-1.5 border border-border bg-surface">
                  <div className="border-b border-border p-2">
                    <input
                      type="search"
                      placeholder="Search by name or BIC"
                      value={bankPickerQuery}
                      onChange={(e) => setBankPickerQuery(e.target.value)}
                      className={fieldClass}
                      autoFocus
                    />
                  </div>
                  <ul className="max-h-52 overflow-y-auto" role="listbox" aria-label="Banks">
                    {pickerBanks.map((bank) => {
                      const selected = bank.bic === form.bankBic;
                      return (
                        <li key={bank.bic}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              updateField("bankBic", bank.bic);
                              setBankPickerOpen(false);
                              setBankPickerQuery("");
                            }}
                            className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-brand-soft ${
                              selected ? "bg-brand-soft" : ""
                            }`}
                          >
                            <BankLogo bic={bank.bic} name={bank.name} size="sm" />
                            <span className="min-w-0 flex-1 truncate text-foreground">
                              {bank.name}
                            </span>
                            <span className="shrink-0 font-mono text-[11px] text-muted">
                              {bank.bic}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>

            <div>
              <label htmlFor="account" className="mb-1 block text-xs font-medium text-muted">
                Account number
              </label>
              <input
                id="account"
                required
                value={form.account}
                onChange={(e) => updateField("account", e.target.value)}
                className={fieldClass}
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-medium text-muted">
                Name on account
              </label>
              <input
                id="name"
                required
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className={fieldClass}
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="amount" className="mb-1 block text-xs font-medium text-muted">
                Amount (ETB)
              </label>
              <input
                id="amount"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => updateField("amount", e.target.value)}
                placeholder="Leave blank if payer enters amount"
                className={fieldClass}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className="mb-1 block text-xs font-medium text-muted">
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+251"
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="till" className="mb-1 block text-xs font-medium text-muted">
                  Till number
                </label>
                <input
                  id="till"
                  value={form.till}
                  onChange={(e) => updateField("till", e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="city" className="mb-1 block text-xs font-medium text-muted">
                City
              </label>
              <input
                id="city"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                className={fieldClass}
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
            >
              Create QR
            </button>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="border border-border bg-surface p-5">
              {selectedBankOption ? (
                <div className="mb-4 flex items-center gap-3 pb-4 border-b border-border">
                  <BankLogo
                    bic={selectedBankOption.bic}
                    name={selectedBankOption.name}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {selectedBankOption.name}
                    </p>
                    <p className="font-mono text-[11px] text-muted">{selectedBankOption.bic}</p>
                  </div>
                </div>
              ) : null}

              <p className="text-xs font-medium text-muted">Preview</p>
              <div className="mt-3 flex min-h-[260px] items-center justify-center border border-dashed border-border bg-background p-4">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="Payment QR code"
                    width={260}
                    height={260}
                    className="max-w-full"
                  />
                ) : (
                  <p className="text-center text-sm text-muted">No QR yet.</p>
                )}
              </div>
              {qrDataUrl ? (
                <button
                  type="button"
                  onClick={downloadPng}
                  className="mt-3 w-full rounded border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-brand-soft"
                >
                  Save as PNG
                </button>
              ) : null}
            </div>

            {selectedBank && payload ? (
              <div className="border border-border bg-surface p-5 text-sm">
                <dl className="space-y-2">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">BIC</dt>
                    <dd className="font-mono text-foreground">{selectedBank.bic}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Amount</dt>
                    <dd className="text-foreground">{amountInQr ?? "Any amount"}</dd>
                  </div>
                </dl>
                <div className="mt-4 border-t border-border pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-muted">Payload string</span>
                    <button
                      type="button"
                      onClick={() => void copyPayload()}
                      className="text-xs font-medium text-brand hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="max-h-36 overflow-auto border border-border bg-background p-2 font-mono text-[10px] leading-relaxed break-all text-foreground">
                    {payload}
                  </pre>
                </div>
              </div>
            ) : null}
          </aside>
        </div>

        <section className="mt-10 border-t border-border pt-8">
          <button
            type="button"
            onClick={() => setShowBankList((v) => !v)}
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <span className="text-sm font-medium text-foreground">
              All banks ({BANKS.length})
            </span>
            <span className="text-xs text-muted">{showBankList ? "Close" : "Open list"}</span>
          </button>
          {showBankList ? (
            <div className="mt-3 border border-border bg-surface">
              <div className="border-b border-border p-3">
                <input
                  type="search"
                  placeholder="Filter"
                  value={bankFilter}
                  onChange={(e) => setBankFilter(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <ul className="max-h-64 divide-y divide-border overflow-y-auto">
                {filteredBanks.map((bank) => (
                  <li key={bank.bic}>
                    <button
                      type="button"
                      onClick={() => {
                        updateField("bankBic", bank.bic);
                        setBankPickerOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-brand-soft"
                    >
                      <BankLogo bic={bank.bic} name={bank.name} size="sm" />
                      <span className="min-w-0 flex-1 text-foreground">{bank.name}</span>
                      <span className="font-mono text-[11px] text-muted">
                        {bank.bic}, code {bank.bankCode}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <p className="mt-8 max-w-2xl text-[11px] leading-relaxed text-muted">
          QR layout matches a common Ethiopian TLV example; banks may interpret fields differently.
          Logos from{" "}
          <a
            href="https://github.com/motiabebe/FaydaLink"
            className="text-brand underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            FaydaLink
          </a>{" "}
          and{" "}
          <a
            href="https://github.com/Chapa-Et/ethiopianlogos"
            className="text-brand underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            EthiopianLogos
          </a>
          .
        </p>
      </div>
    </div>
  );
}
