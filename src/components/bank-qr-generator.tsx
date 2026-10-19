"use client";

import QRCode from "qrcode";
import { useCallback, useMemo, useState } from "react";
import {
  BANKS,
  buildPayload,
  type Bank,
} from "@/lib/ethiopian-bank-qr";

type FormState = {
  bankBic: string;
  account: string;
  name: string;
  phone: string;
  till: string;
  city: string;
};

const defaultForm: FormState = {
  bankBic: "ABYSETAA",
  account: "",
  name: "",
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
  const [showBankList, setShowBankList] = useState(false);
  const [bankFilter, setBankFilter] = useState("");

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

  const updateField = useCallback(
    (key: keyof FormState, value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    [],
  );

  const generate = useCallback(async () => {
    setError(null);
    setPayload(null);
    setQrDataUrl(null);
    setSelectedBank(null);

    const bank = BANKS.find((b) => b.bic === form.bankBic);
    if (!bank) {
      setError("Please select a bank.");
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
      });
      const dataUrl = await QRCode.toDataURL(nextPayload, {
        errorCorrectionLevel: "M",
        margin: 4,
        width: 320,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setPayload(nextPayload);
      setQrDataUrl(dataUrl);
      setSelectedBank(bank);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate QR code.");
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
      setError("Could not copy payload to clipboard.");
    }
  }, [payload]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Ethiopian Bank QR Generator
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Builds an EMV-style TLV QR payload with the payment amount omitted (tag 54
          is not included). Test with your bank&apos;s app before using for real
          payments.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr,minmax(280px,360px)]">
        <form
          className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          onSubmit={(e) => {
            e.preventDefault();
            void generate();
          }}
        >
          <div>
            <label
              htmlFor="bank"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Bank
            </label>
            <select
              id="bank"
              value={form.bankBic}
              onChange={(e) => updateField("bankBic", e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/0 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {BANKS.map((bank) => (
                <option key={bank.bic} value={bank.bic}>
                  {bank.name} ({bank.bic})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="account"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Account number <span className="text-red-600">*</span>
            </label>
            <input
              id="account"
              required
              value={form.account}
              onChange={(e) => updateField("account", e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              autoComplete="off"
            />
          </div>

          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Recipient / merchant name <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              autoComplete="name"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Phone (optional)
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+251..."
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label
                htmlFor="till"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Merchant till (optional)
              </label>
              <input
                id="till"
                value={form.till}
                onChange={(e) => updateField("till", e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="city"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              City
            </label>
            <input
              id="city"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
          >
            Generate QR code
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              QR preview
            </h2>
            <div className="mt-4 flex min-h-[280px] items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-900">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="Generated bank payment QR code"
                  width={280}
                  height={280}
                  className="rounded-lg"
                />
              ) : (
                <p className="px-4 text-center text-sm text-zinc-500">
                  Fill in the form and generate to see the QR code here.
                </p>
              )}
            </div>
            {qrDataUrl ? (
              <button
                type="button"
                onClick={downloadPng}
                className="mt-4 w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Download PNG
              </button>
            ) : null}
          </div>

          {selectedBank && payload ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <dl className="space-y-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Bank</dt>
                  <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedBank.name}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">BIC</dt>
                  <dd className="font-mono text-zinc-900 dark:text-zinc-100">
                    {selectedBank.bic}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Amount</dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">Not set</dd>
                </div>
              </dl>
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-zinc-500">Payload</span>
                  <button
                    type="button"
                    onClick={() => void copyPayload()}
                    className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    Copy
                  </button>
                </div>
                <pre className="max-h-40 overflow-auto rounded-lg bg-zinc-100 p-3 font-mono text-[11px] leading-relaxed break-all text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  {payload}
                </pre>
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      <section className="mt-12">
        <button
          type="button"
          onClick={() => setShowBankList((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
        >
          Supported banks ({BANKS.length})
          <span className="text-zinc-400">{showBankList ? "Hide" : "Show"}</span>
        </button>
        {showBankList ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
              <input
                type="search"
                placeholder="Filter by name, BIC, or bank code…"
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <ul className="max-h-72 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
              {filteredBanks.map((bank) => (
                <li
                  key={bank.bic}
                  className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5 text-sm"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {bank.name}
                  </span>
                  <span className="font-mono text-xs text-zinc-500">
                    {bank.bic} · code {bank.bankCode}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <p className="mt-8 text-xs leading-relaxed text-zinc-500">
        Payload layout follows the example format supplied for Ethiopian banks; it
        has not been officially verified for every institution listed above.
      </p>
    </div>
  );
}
