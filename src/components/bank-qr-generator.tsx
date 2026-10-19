"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sortBanksForPicker } from "@/lib/bank-list";
import { BankLogo } from "@/components/bank-logo";
import { ChevronDown } from "@/components/chevron-down";
import { PayloadDecoderPanel } from "@/components/payload-decoder-panel";
import { SavedAccountsPanel } from "@/components/saved-accounts-panel";
import { useSavedAccounts } from "@/hooks/use-saved-accounts";
import {
  BANKS,
  buildPayload,
  formatTransactionAmount,
  getAccountInputMeta,
  isYayaWallet,
  usesWalletPhone,
  type Bank,
} from "@/lib/ethiopian-bank-qr";
import type { PayloadFormHints } from "@/lib/emv-qr-parse";
import {
  formFieldsToSavedAccount,
  savedAccountToFormFields,
  type SavedAccount,
} from "@/lib/saved-accounts";
import {
  asideClass,
  btnPrimaryClass,
  btnSecondaryClass,
  fieldClass,
  mainGridClass,
  pageContainerClass,
  panelClass,
} from "@/lib/ui-classes";

type FormState = {
  bankBic: string;
  account: string;
  name: string;
  amount: string;
  remark: string;
  phone: string;
  till: string;
  city: string;
  encoding: "ips" | "legacy";
  merchantGuid: string;
  yayaUsername: string;
};

const defaultForm: FormState = {
  bankBic: "ABYSETAA",
  account: "",
  name: "",
  amount: "",
  remark: "",
  phone: "",
  till: "",
  city: "ADDIS ABABA",
  encoding: "ips",
  merchantGuid: "",
  yayaUsername: "",
};

export function BankQrGenerator() {
  const { accounts, upsert, remove, mergeImported } = useSavedAccounts();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  const [saveLabel, setSaveLabel] = useState("");
  const [quickAmount, setQuickAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [amountInQr, setAmountInQr] = useState<string | null>(null);
  const [remarkInQr, setRemarkInQr] = useState<string | null>(null);
  const [poiInQr, setPoiInQr] = useState<string | null>(null);
  const [livePreview, setLivePreview] = useState(true);
  const [showBankList, setShowBankList] = useState(false);
  const [bankFilter, setBankFilter] = useState("");
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankPickerQuery, setBankPickerQuery] = useState("");

  const selectedBankOption = useMemo(
    () => BANKS.find((b) => b.bic === form.bankBic),
    [form.bankBic],
  );

  const accountInput = useMemo(
    () => getAccountInputMeta(selectedBankOption ?? BANKS[0]),
    [selectedBankOption],
  );

  const isWallet = selectedBankOption ? usesWalletPhone(selectedBankOption) : false;
  const isYaya = selectedBankOption ? isYayaWallet(selectedBankOption) : false;

  const pickBank = useCallback(
    (bic: string) => {
      const bank = BANKS.find((b) => b.bic === bic);
      setForm((prev) => ({
        ...prev,
        bankBic: bic,
        encoding: bank && usesWalletPhone(bank) ? "ips" : prev.encoding,
      }));
      setError(null);
    },
    [],
  );

  const filterBanks = useCallback((query: string) => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? BANKS.filter(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            b.bic.toLowerCase().includes(q) ||
            b.bankCode.includes(q),
        )
      : [...BANKS];
    return sortBanksForPicker(matched, query);
  }, []);

  const pickerBanks = useMemo(
    () => filterBanks(bankPickerQuery),
    [bankPickerQuery, filterBanks],
  );

  const filteredBanks = useMemo(() => filterBanks(bankFilter), [bankFilter, filterBanks]);

  const clearPreview = useCallback(() => {
    setPayload(null);
    setQrDataUrl(null);
    setSelectedBank(null);
    setAmountInQr(null);
    setRemarkInQr(null);
    setPoiInQr(null);
  }, []);

  const updateField = useCallback((key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  const runGenerate = useCallback(
    async (fields: FormState, amountValue: string, options?: { clearFirst?: boolean }) => {
      const clearFirst = options?.clearFirst !== false;
      if (clearFirst) {
        setError(null);
        clearPreview();
      }

      const bank = BANKS.find((b) => b.bic === fields.bankBic);
      if (!bank) {
        if (clearFirst) setError("Pick a bank first.");
        return;
      }

      try {
        const nextPayload = await buildPayload({
          bank,
          account: fields.account,
          name: fields.name,
          phone: fields.phone || undefined,
          till: fields.till || undefined,
          yayaUsername: fields.yayaUsername || undefined,
          city: fields.city,
          amount: amountValue.trim() || undefined,
          remark: fields.remark || undefined,
          encoding: fields.encoding,
          merchantGuid: fields.merchantGuid || undefined,
        });
        const dataUrl = await QRCode.toDataURL(nextPayload, {
          errorCorrectionLevel: "M",
          margin: 4,
          width: 300,
          color: { dark: "#000000", light: "#ffffff" },
        });
        setPayload(nextPayload);
        setQrDataUrl(dataUrl);
        setSelectedBank(bank);
        const formattedAmount = formatTransactionAmount(amountValue || undefined);
        setAmountInQr(formattedAmount ? `${formattedAmount} ETB` : null);
        setPoiInQr(formattedAmount ? "Fixed amount (POI 12)" : "Any amount (POI 11)");
        setRemarkInQr(fields.remark.trim() || null);
        if (!clearFirst) setError(null);
      } catch (e) {
        if (clearFirst) {
          setError(e instanceof Error ? e.message : "Could not build the QR.");
        }
      }
    },
    [clearPreview],
  );

  useEffect(() => {
    if (!livePreview) return;
    const bank = BANKS.find((b) => b.bic === form.bankBic);
    if (!bank || !form.account.trim() || !form.name.trim()) return;
    if (isYayaWallet(bank) && !form.yayaUsername.trim()) return;
    const timer = window.setTimeout(() => {
      void runGenerate(form, form.amount, { clearFirst: false });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [form, livePreview, runGenerate]);

  const applyPayloadHints = useCallback((hints: PayloadFormHints | null) => {
    if (!hints) return;
    setForm((prev) => ({
      ...prev,
      bankBic: hints.bankBic,
      account: hints.account,
      name: hints.name,
      amount: hints.amount,
      remark: hints.remark,
      city: hints.city,
      merchantGuid: hints.merchantGuid,
      yayaUsername: hints.yayaUsername,
      encoding: hints.encoding,
    }));
    setError(null);
  }, []);

  const generate = useCallback(async () => {
    await runGenerate(form, form.amount);
  }, [form, runGenerate]);

  const generateOpenAmount = useCallback(async () => {
    const fields = { ...form, amount: "" };
    setForm(fields);
    await runGenerate(fields, "");
  }, [form, runGenerate]);

  const selectSavedAccount = useCallback(
    (account: SavedAccount) => {
      const bank = BANKS.find((b) => b.bic === account.bankBic);
      const fields = savedAccountToFormFields(account);
      setActiveSavedId(account.id);
      setSaveLabel(account.label);
      setForm({
        ...fields,
        amount: "",
        remark: "",
        yayaUsername: fields.yayaUsername ?? "",
        encoding: bank && usesWalletPhone(bank) ? "ips" : fields.encoding,
      });
      clearPreview();
      setError(null);
    },
    [clearPreview],
  );

  const saveCurrentAccount = useCallback(() => {
    try {
      const id = activeSavedId ?? crypto.randomUUID();
      const saved = formFieldsToSavedAccount(
        {
          bankBic: form.bankBic,
          account: form.account,
          name: form.name,
          phone: form.phone,
          till: form.till,
          city: form.city,
          encoding: form.encoding,
          merchantGuid: form.merchantGuid,
          yayaUsername: form.yayaUsername,
          accountType: BANKS.find((b) => b.bic === form.bankBic)?.accountType,
        },
        id,
        saveLabel || undefined,
      );
      upsert(saved);
      setActiveSavedId(id);
      setSaveLabel(saved.label);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save account.");
    }
  }, [activeSavedId, form, saveLabel, upsert]);

  const quickQrFromSaved = useCallback(
    async (account: SavedAccount, withAmount: boolean) => {
      const amount = withAmount ? quickAmount : "";
      if (withAmount && !amount.trim()) {
        setError('Set "Amount for QR with amount shortcuts" under saved accounts.');
        return;
      }
      const savedFields = savedAccountToFormFields(account);
      const fields: FormState = {
        ...savedFields,
        yayaUsername: savedFields.yayaUsername ?? "",
        amount,
        remark: form.remark,
      };
      setActiveSavedId(account.id);
      setSaveLabel(account.label);
      setForm(fields);
      await runGenerate(fields, amount);
    },
    [form.remark, quickAmount, runGenerate],
  );

  const clearSavedSelection = useCallback(() => {
    setActiveSavedId(null);
    setSaveLabel("");
  }, []);

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
      <div className="border-b border-border bg-surface pt-[env(safe-area-inset-top,0)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <p className="text-sm font-semibold tracking-wide text-brand sm:text-base">AladPay</p>
          <p className="text-xs text-muted sm:text-sm">Ethiopia · ETB</p>
        </div>
      </div>

      <div className={pageContainerClass}>
        <header className="max-w-2xl">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl md:text-[1.65rem]">
            Bank payment QR
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted md:text-[0.9375rem]">
            Static QR for receiving money. Amount is optional. Scan with the payer&apos;s bank app
            to confirm it works before you rely on it.
          </p>
        </header>

        <div className="mt-6 md:mt-8">
          <SavedAccountsPanel
            accounts={accounts}
            activeId={activeSavedId}
            saveLabel={saveLabel}
            onSaveLabelChange={setSaveLabel}
            onSelect={selectSavedAccount}
            onClearSelection={clearSavedSelection}
            onSave={saveCurrentAccount}
            onRemove={(id) => {
              remove(id);
              if (activeSavedId === id) clearSavedSelection();
            }}
            onQuickQr={(account, withAmount) => void quickQrFromSaved(account, withAmount)}
            quickAmount={quickAmount}
            onQuickAmountChange={setQuickAmount}
            onImport={mergeImported}
          />
        </div>

        <PayloadDecoderPanel onApplyHints={applyPayloadHints} />

        <div className={mainGridClass}>
          <form
            className={`order-2 space-y-4 md:order-1 ${panelClass}`}
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
                className="flex min-h-11 w-full items-center gap-3 rounded border border-border bg-background px-3 py-2.5 text-left text-base outline-none focus:border-brand focus:ring-1 focus:ring-brand sm:min-h-0 sm:text-sm"
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
                  <ul
                    className="max-h-[min(50vh,14rem)] overflow-y-auto overscroll-contain sm:max-h-52"
                    role="listbox"
                    aria-label="Banks"
                  >
                    {pickerBanks.map((bank) => {
                      const selected = bank.bic === form.bankBic;
                      return (
                        <li key={bank.bic}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              pickBank(bank.bic);
                              setBankPickerOpen(false);
                              setBankPickerQuery("");
                            }}
                            className={`flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-brand-soft active:bg-brand-soft ${
                              selected ? "bg-brand-soft" : ""
                            }`}
                          >
                            <BankLogo bic={bank.bic} name={bank.name} size="sm" />
                            <span className="min-w-0 flex-1 truncate text-foreground">
                              {bank.name}
                              {usesWalletPhone(bank) ? (
                                <span className="ml-1.5 text-[10px] font-normal text-muted">
                                  Wallet
                                </span>
                              ) : null}
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
                {accountInput.label}
              </label>
              <input
                id="account"
                required
                type={isWallet ? "tel" : "text"}
                inputMode={accountInput.inputMode}
                value={form.account}
                onChange={(e) => updateField("account", e.target.value)}
                placeholder={accountInput.placeholder}
                className={fieldClass}
                autoComplete={isWallet ? "tel" : "off"}
              />
              {accountInput.hint ? (
                <p className="mt-1 text-[11px] leading-relaxed text-muted">{accountInput.hint}</p>
              ) : null}
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

            <div>
              <label htmlFor="remark" className="mb-1 block text-xs font-medium text-muted">
                Remark or reason
              </label>
              <input
                id="remark"
                value={form.remark}
                onChange={(e) => updateField("remark", e.target.value)}
                placeholder="e.g. Rent for March"
                maxLength={50}
                className={fieldClass}
              />
              <p className="mt-1 text-[11px] text-muted">
                {isYaya
                  ? "Optional tag 62-08 text. Leave blank to use Pay to YAYA:yourusername."
                  : isWallet
                    ? "Optional note encoded in tag 62 (purpose). CBE Birr does not use tag 80."
                    : "Shown to the payer when supported (NBE context tag 80 and purpose in tag 62)."}
              </p>
            </div>

            {isYaya ? (
              <div>
                <label htmlFor="yayaUsername" className="mb-1 block text-xs font-medium text-muted">
                  Yaya username
                </label>
                <input
                  id="yayaUsername"
                  required
                  value={form.yayaUsername}
                  onChange={(e) => updateField("yayaUsername", e.target.value)}
                  placeholder="mengstabkete"
                  autoComplete="username"
                  className={fieldClass}
                />
                <p className="mt-1 text-[11px] text-muted">
                  Your handle in the Yaya app (stored as YAYA plus username in the QR).
                </p>
              </div>
            ) : null}

            {isWallet ? null : (
              <div className="grid gap-4 md:grid-cols-2">
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
            )}

            <div>
              <label htmlFor="city" className="mb-1 block text-xs font-medium text-muted">
                {isYaya ? "Address" : "City"}
              </label>
              <input
                id="city"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder={isYaya ? "Woreda 06, Bole, Addis Ababa" : undefined}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="encoding" className="mb-1 block text-xs font-medium text-muted">
                QR standard
              </label>
              <select
                id="encoding"
                value={form.encoding}
                disabled={isWallet}
                onChange={(e) =>
                  updateField("encoding", e.target.value as FormState["encoding"])
                }
                className={fieldClass}
              >
                <option value="ips">IPS ET (national interoperable)</option>
                <option value="legacy" disabled={isWallet}>
                  Legacy (BIC + 0002246 prefix)
                </option>
              </select>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {isYaya
                  ? "Yaya uses IPS ET with a merchant GUID, nine-digit phone in tag 28, and Yaya-specific tag 62 fields."
                  : isWallet
                    ? "CBE Birr uses IPS ET with your full wallet phone (251…) in tag 28."
                    : "Use IPS ET for Dashen, Awash, and other banks on the national QR network. Try legacy only if your bank gave you that older layout (some Abyssinia QRs)."}
              </p>
            </div>

            {form.encoding === "ips" && (!isWallet || isYaya) ? (
              <div>
                <label htmlFor="merchantGuid" className="mb-1 block text-xs font-medium text-muted">
                  Merchant GUID (optional)
                </label>
                <input
                  id="merchantGuid"
                  value={form.merchantGuid}
                  onChange={(e) => updateField("merchantGuid", e.target.value)}
                  placeholder={
                    isYaya
                      ? "32 hex chars from Yaya, or leave blank to derive"
                      : "32 hex chars from your bank, or leave blank"
                  }
                  className={`${fieldClass} font-mono text-xs`}
                  spellCheck={false}
                />
              </div>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900"
              >
                {error}
              </p>
            ) : null}

            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={livePreview}
                onChange={(e) => setLivePreview(e.target.checked)}
                className="size-3.5 accent-brand"
              />
              Update preview while typing
            </label>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => void generateOpenAmount()} className={btnSecondaryClass}>
                Create QR, any amount
              </button>
              <button type="submit" className={btnPrimaryClass}>
                Create QR{form.amount.trim() ? " with amount" : ""}
              </button>
            </div>
          </form>

          <aside className={`order-1 md:order-2 ${asideClass}`}>
            <div className={panelClass}>
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
              <div className="mt-3 flex min-h-[220px] items-center justify-center border border-dashed border-border bg-background p-3 sm:min-h-[260px] sm:p-4">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="Payment QR code"
                    width={260}
                    height={260}
                    className="h-auto w-full max-w-[min(100%,280px)]"
                  />
                ) : (
                  <p className="text-center text-sm text-muted">No QR yet.</p>
                )}
              </div>
              {qrDataUrl ? (
                <button type="button" onClick={downloadPng} className={`mt-3 ${btnSecondaryClass}`}>
                  Save as PNG
                </button>
              ) : null}
            </div>

            {selectedBank && payload ? (
              <div className={`${panelClass} text-sm`}>
                <dl className="space-y-2">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">BIC</dt>
                    <dd className="font-mono text-foreground">{selectedBank.bic}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Amount</dt>
                    <dd className="text-foreground">{amountInQr ?? "Any amount"}</dd>
                  </div>
                  {poiInQr ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Mode</dt>
                      <dd className="text-right text-foreground">{poiInQr}</dd>
                    </div>
                  ) : null}
                  {remarkInQr ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Remark</dt>
                      <dd className="max-w-[60%] text-right text-foreground">{remarkInQr}</dd>
                    </div>
                  ) : null}
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

        <section className="mt-8 border-t border-border pt-6 md:mt-10 md:pt-8">
          <button
            type="button"
            onClick={() => setShowBankList((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between gap-4 text-left active:opacity-80"
          >
            <span className="text-sm font-medium text-foreground md:text-base">
              All banks ({BANKS.length})
            </span>
            <span className="text-xs text-muted">{showBankList ? "Close" : "Open list"}</span>
          </button>
          {showBankList ? (
            <div className={`mt-3 ${panelClass} !p-0`}>
              <div className="border-b border-border p-3 sm:p-4">
                <input
                  type="search"
                  placeholder="Filter"
                  value={bankFilter}
                  onChange={(e) => setBankFilter(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <ul className="max-h-[min(60vh,20rem)] divide-y divide-border overflow-y-auto overscroll-contain md:max-h-72">
                {filteredBanks.map((bank) => (
                  <li key={bank.bic}>
                    <button
                      type="button"
                      onClick={() => {
                        pickBank(bank.bic);
                        setBankPickerOpen(false);
                      }}
                      className="flex min-h-12 w-full flex-col gap-2 px-3 py-3 text-left text-sm hover:bg-brand-soft active:bg-brand-soft sm:min-h-11 sm:flex-row sm:items-center sm:gap-3 sm:py-2.5"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <BankLogo bic={bank.bic} name={bank.name} size="sm" />
                        <span className="min-w-0 flex-1 text-foreground">{bank.name}</span>
                      </div>
                      <span className="pl-10 font-mono text-[11px] text-muted sm:shrink-0 sm:pl-0 sm:text-xs">
                        {bank.bic}, code {bank.bankCode}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <p className="mt-6 max-w-2xl pb-6 text-[11px] leading-relaxed text-muted sm:mt-8 sm:pb-8 md:text-xs">
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
