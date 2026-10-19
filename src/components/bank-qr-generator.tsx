"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PosPanel } from "@/components/pos/pos-panel";
import { AladVerifyPanel } from "@/components/alad-verify-panel";
import { AppShell } from "@/components/app-shell";
import { bicToAladBank } from "@/lib/alad/bank-codes";
import type { AppSection } from "@/lib/app-sections";
import { sectionMeta } from "@/lib/app-sections";
import { sortBanksForPicker, BANKS } from "@/lib/bank-list";
import { BankLogo } from "@/components/bank-logo";
import { ChevronDown } from "@/components/chevron-down";
import { PayloadDecoderPanel } from "@/components/payload-decoder-panel";
import { SavedAccountsPanel } from "@/components/saved-accounts-panel";
import { useFavoriteBanks } from "@/hooks/use-favorite-banks";
import { usePaymentQrForm } from "@/hooks/use-payment-qr-form";
import { useSavedAccounts } from "@/hooks/use-saved-accounts";
import type { SavedAccount } from "@/lib/saved-accounts";
import bankHints from "@/data/bank-hints.json";
import {
  getAccountInputMeta,
  isYayaWallet,
  usesWalletPhone,
} from "@/lib/ethiopian-bank-qr";
import {
  getFormFieldError,
  type ValidatedFormField,
} from "@/lib/form-field-errors";
import {
  asideClass,
  btnPrimaryClass,
  btnSecondaryClass,
  fieldClass,
  mainGridClass,
  pageContainerClass,
  panelClass,
} from "@/lib/ui-classes";

const ETB_AMOUNT_PRESETS = [50, 100, 500, 1000] as const;

function fieldErrorClass(hasError: boolean): string {
  return hasError ? `${fieldClass} border-red-400 focus:border-red-500 focus:ring-red-500` : fieldClass;
}

export function BankQrGenerator() {
  const { accounts, upsert, remove, mergeImported, replaceImported } = useSavedAccounts();
  const { favorites, toggle: toggleFavorite } = useFavoriteBanks();
  const qr = usePaymentQrForm();

  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  const [saveLabel, setSaveLabel] = useState("");
  const [quickAmount, setQuickAmount] = useState("");
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankPickerQuery, setBankPickerQuery] = useState("");
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<AppSection>(() => {
    const section = searchParams.get("section");
    if (
      section === "pos" ||
      section === "create" ||
      section === "saved" ||
      section === "verify" ||
      section === "decoder" ||
      section === "banks"
    ) {
      return section;
    }
    return "create";
  });
  const [bankFilter, setBankFilter] = useState("");
  const [touched, setTouched] = useState<Partial<Record<ValidatedFormField, boolean>>>({});

  const form = qr.form;

  const touchField = useCallback((field: ValidatedFormField) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }, []);

  const showFieldError = useCallback(
    (field: ValidatedFormField) =>
      touched[field] ? getFormFieldError(form, field) : null,
    [form, touched],
  );

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

  const bankHint =
    selectedBankOption &&
    bankHints[selectedBankOption.bic as keyof typeof bankHints];

  const aladVerifyDefaults = useMemo(() => {
    const bic = form.bankBic;
    return {
      aladBank: bicToAladBank(bic),
      settlementAccount: form.account.trim(),
      expectedAmount:
        form.amountMode === "fixed" && form.amount.trim() ? form.amount.trim() : undefined,
      accountName: form.name.trim() || undefined,
      walletPhone: isWallet ? form.account.trim() : undefined,
    };
  }, [
    form.account,
    form.amount,
    form.amountMode,
    form.bankBic,
    form.name,
    isWallet,
  ]);

  const pickerBanks = useMemo(
    () => sortBanksForPicker(BANKS, bankPickerQuery, favorites),
    [bankPickerQuery, favorites],
  );

  const filteredBanks = useMemo(
    () => sortBanksForPicker(BANKS, bankFilter, favorites),
    [bankFilter, favorites],
  );

  const saveCurrentAccount = useCallback(() => {
    try {
      const id = activeSavedId ?? crypto.randomUUID();
      const saved = qr.formFieldsToSavedAccount(qr.buildSavedFields(), id, saveLabel || undefined);
      upsert(saved);
      setActiveSavedId(id);
      setSaveLabel(saved.label);
      qr.setError(null);
    } catch (e) {
      qr.setError(e instanceof Error ? e.message : "Could not save account.");
    }
  }, [activeSavedId, qr, saveLabel, upsert]);

  const quickQrFromSaved = useCallback(
    async (account: SavedAccount, withAmount: boolean) => {
      const amount = withAmount ? quickAmount : "";
      if (withAmount && !amount.trim()) {
        qr.setError('Set "Amount for QR with amount shortcuts" under saved accounts.');
        return;
      }
      const fields = qr.formStateForQuickQr(account, amount, form.remark);
      setActiveSavedId(account.id);
      setSaveLabel(account.label);
      qr.setForm(fields);
      await qr.runGenerate(fields, amount);
    },
    [form.remark, qr, quickAmount],
  );

  const downloadPng = useCallback(() => {
    if (!qr.qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qr.qrDataUrl;
    link.download = "bank_qr.png";
    link.click();
  }, [qr.qrDataUrl]);

  const goToSection = useCallback((section: AppSection) => {
    setActiveSection(section);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeSection]);

  const section = sectionMeta(activeSection);
  const sectionTitle =
    activeSection === "banks" ? `All banks (${BANKS.length})` : section.label;

  return (
    <AppShell activeSection={activeSection} onSectionChange={goToSection}>
      <div className={pageContainerClass}>
        <header className="max-w-2xl">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl md:text-[1.65rem]">
            {sectionTitle}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted md:text-[0.9375rem]">
            {section.description}
          </p>
        </header>

        {activeSection === "saved" ? (
          <div className="no-print mt-6 md:mt-8">
            <SavedAccountsPanel
              accounts={accounts}
              activeId={activeSavedId}
              saveLabel={saveLabel}
              onSaveLabelChange={setSaveLabel}
              onSelect={(account) => {
                qr.loadSavedAccount(account);
                setActiveSavedId(account.id);
                setSaveLabel(account.label);
                goToSection("create");
              }}
              onClearSelection={() => {
                setActiveSavedId(null);
                setSaveLabel("");
              }}
              onSave={saveCurrentAccount}
              onRemove={(id) => {
                remove(id);
                if (activeSavedId === id) {
                  setActiveSavedId(null);
                  setSaveLabel("");
                }
              }}
              onQuickQr={async (account, withAmount) => {
                await quickQrFromSaved(account, withAmount);
                goToSection("create");
              }}
              quickAmount={quickAmount}
              onQuickAmountChange={setQuickAmount}
              onMergeImport={mergeImported}
              onReplaceImport={replaceImported}
            />
          </div>
        ) : null}

        {activeSection === "pos" ? (
          <div className="no-print mt-6 md:mt-8">
            <PosPanel />
          </div>
        ) : null}

        {activeSection === "verify" ? (
          <div className="no-print mt-6 md:mt-8">
            <AladVerifyPanel
              key={`${form.bankBic}:${form.account}:${form.amountMode}:${form.amount}`}
              defaults={aladVerifyDefaults}
            />
          </div>
        ) : null}

        {activeSection === "decoder" ? (
          <div className="no-print mt-6 md:mt-8">
            <PayloadDecoderPanel
              onApplyHints={qr.applyPayloadHints}
              onApplyMerchantGuid={qr.applyMerchantGuid}
            />
          </div>
        ) : null}

        {activeSection === "create" ? (
        <div className={mainGridClass}>
          <form
            className={`no-print order-2 space-y-4 md:order-1 ${panelClass}`}
            onSubmit={(e) => {
              e.preventDefault();
              void qr.generate();
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
                      const isFav = favorites.includes(bank.bic);
                      return (
                        <li key={bank.bic}>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onClick={() => {
                                qr.pickBank(bank.bic);
                                setBankPickerOpen(false);
                                setBankPickerQuery("");
                              }}
                              className={`flex min-h-11 min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-brand-soft active:bg-brand-soft ${
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
                            <button
                              type="button"
                              title={isFav ? "Remove favorite" : "Add favorite"}
                              aria-label={
                                isFav
                                  ? `Remove ${bank.name} from favorites`
                                  : `Add ${bank.name} to favorites`
                              }
                              onClick={() => toggleFavorite(bank.bic)}
                              className="mr-2 shrink-0 px-1 text-sm text-muted hover:text-brand"
                            >
                              {isFav ? "★" : "☆"}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              {bankHint ? (
                <p className="mt-2 text-[11px] leading-relaxed text-muted">{bankHint}</p>
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
                onChange={(e) => qr.updateField("account", e.target.value)}
                onBlur={() => touchField("account")}
                placeholder={accountInput.placeholder}
                className={fieldErrorClass(Boolean(showFieldError("account")))}
                autoComplete={isWallet ? "tel" : "off"}
                aria-invalid={Boolean(showFieldError("account"))}
                data-testid="account-input"
              />
              {showFieldError("account") ? (
                <p className="mt-1 text-[11px] text-red-800" role="alert">
                  {showFieldError("account")}
                </p>
              ) : accountInput.hint ? (
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
                onChange={(e) => qr.updateField("name", e.target.value)}
                onBlur={() => touchField("name")}
                className={fieldErrorClass(Boolean(showFieldError("name")))}
                autoComplete="name"
                aria-invalid={Boolean(showFieldError("name"))}
                data-testid="name-input"
              />
              {showFieldError("name") ? (
                <p className="mt-1 text-[11px] text-red-800" role="alert">
                  {showFieldError("name")}
                </p>
              ) : null}
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-medium text-muted">Amount mode</legend>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={form.amountMode === "any"}
                  onClick={() => {
                    qr.updateField("amountMode", "any");
                    qr.updateField("amount", "");
                  }}
                  className={
                    form.amountMode === "any"
                      ? btnPrimaryClass + " !min-h-9 text-xs"
                      : btnSecondaryClass + " !min-h-9 text-xs"
                  }
                >
                  Any amount
                </button>
                <button
                  type="button"
                  aria-pressed={form.amountMode === "fixed"}
                  onClick={() => qr.updateField("amountMode", "fixed")}
                  className={
                    form.amountMode === "fixed"
                      ? btnPrimaryClass + " !min-h-9 text-xs"
                      : btnSecondaryClass + " !min-h-9 text-xs"
                  }
                >
                  Fixed amount
                </button>
              </div>
            </fieldset>

            {form.amountMode === "fixed" ? (
              <div>
                <label htmlFor="amount" className="mb-1 block text-xs font-medium text-muted">
                  Amount (ETB)
                </label>
                <input
                  id="amount"
                  required
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => qr.updateField("amount", e.target.value)}
                  onBlur={() => touchField("amount")}
                  className={fieldErrorClass(Boolean(showFieldError("amount")))}
                  aria-invalid={Boolean(showFieldError("amount"))}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {ETB_AMOUNT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={btnSecondaryClass + " !min-h-8 px-2.5 text-xs"}
                      onClick={() => qr.updateField("amount", String(preset))}
                    >
                      {preset} ETB
                    </button>
                  ))}
                </div>
                {showFieldError("amount") ? (
                  <p className="mt-1 text-[11px] text-red-800" role="alert">
                    {showFieldError("amount")}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div>
              <label htmlFor="remark" className="mb-1 block text-xs font-medium text-muted">
                Remark or reason
              </label>
              <input
                id="remark"
                value={form.remark}
                onChange={(e) => qr.updateField("remark", e.target.value)}
                placeholder="e.g. Rent for March"
                maxLength={50}
                className={fieldClass}
              />
              <p className="mt-1 text-[11px] text-muted">
                {isYaya
                  ? "Optional payment note. Leave blank for a default pay-to message."
                  : "Optional note for the payer when their app supports it."}
              </p>
            </div>

            {isYaya ? (
              <>
                <div>
                  <label htmlFor="yayaUsername" className="mb-1 block text-xs font-medium text-muted">
                    Yaya username
                  </label>
                  <input
                    id="yayaUsername"
                    required
                    value={form.yayaUsername}
                    onChange={(e) => qr.updateField("yayaUsername", e.target.value)}
                    onBlur={() => touchField("yayaUsername")}
                    placeholder="mengstabkete"
                    autoComplete="username"
                    className={fieldErrorClass(Boolean(showFieldError("yayaUsername")))}
                    aria-invalid={Boolean(showFieldError("yayaUsername"))}
                  />
                  {showFieldError("yayaUsername") ? (
                    <p className="mt-1 text-[11px] text-red-800" role="alert">
                      {showFieldError("yayaUsername")}
                    </p>
                  ) : null}
                </div>
                <label className="flex items-start gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={form.yayaTag62Encoding === "yaya_app"}
                    onChange={(e) =>
                      qr.updateField(
                        "yayaTag62Encoding",
                        e.target.checked ? "yaya_app" : "standard",
                      )
                    }
                    className="mt-0.5 size-3.5 accent-brand"
                  />
                  <span>Alternate Yaya QR format — enable if the Yaya app does not scan your code.</span>
                </label>
              </>
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
                    onChange={(e) => qr.updateField("phone", e.target.value)}
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
                    onChange={(e) => qr.updateField("till", e.target.value)}
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
                onChange={(e) => qr.updateField("city", e.target.value)}
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
                  qr.updateField("encoding", e.target.value as typeof form.encoding)
                }
                className={fieldClass}
              >
                <option value="ips">National interoperable</option>
                <option value="legacy" disabled={isWallet}>
                  Legacy bank format
                </option>
              </select>
            </div>

            {form.encoding === "ips" && (!isWallet || isYaya) ? (
              <div>
                <label htmlFor="merchantGuid" className="mb-1 block text-xs font-medium text-muted">
                  Payment identifier (optional)
                </label>
                <input
                  id="merchantGuid"
                  value={form.merchantGuid}
                  onChange={(e) => qr.updateField("merchantGuid", e.target.value)}
                  onBlur={() => touchField("merchantGuid")}
                  placeholder={
                    isYaya
                      ? "From a working Yaya QR if auto-fill fails"
                      : "From your bank if required, or leave blank"
                  }
                  className={`${fieldErrorClass(Boolean(showFieldError("merchantGuid")))} font-mono text-xs`}
                  spellCheck={false}
                  aria-invalid={Boolean(showFieldError("merchantGuid"))}
                />
                {showFieldError("merchantGuid") ? (
                  <p className="mt-1 text-[11px] text-red-800" role="alert">
                    {showFieldError("merchantGuid")}
                  </p>
                ) : null}
              </div>
            ) : null}

            {qr.error ? (
              <p
                role="alert"
                className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900"
              >
                {qr.error}
              </p>
            ) : null}

            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={qr.livePreview}
                onChange={(e) => qr.setLivePreview(e.target.checked)}
                className="size-3.5 accent-brand"
              />
              Update preview while typing
            </label>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void qr.generateOpenAmount()}
                className={btnSecondaryClass}
              >
                Refresh open amount QR
              </button>
              <button type="submit" className={btnPrimaryClass} data-testid="generate-qr">
                {form.amountMode === "fixed" ? "Create QR with amount" : "Create QR"}
              </button>
            </div>
          </form>

          <aside className={`order-1 md:order-2 ${asideClass}`}>
            <div className={`no-print ${panelClass}`}>
              {selectedBankOption ? (
                <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
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
                {qr.qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qr.qrDataUrl}
                    alt="Payment QR code"
                    width={260}
                    height={260}
                    className="h-auto w-full max-w-[min(100%,280px)]"
                  />
                ) : (
                  <div className="space-y-2 px-2 text-center text-sm text-muted">
                    <p>No QR yet.</p>
                    {qr.previewBlockReason ? (
                      <p className="text-xs text-amber-900" role="status">
                        Preview waiting: {qr.previewBlockReason}
                      </p>
                    ) : qr.previewError ? (
                      <p className="text-xs text-red-800" role="alert">
                        Preview failed: {qr.previewError}
                      </p>
                    ) : qr.livePreview ? (
                      <p className="text-xs">Generating preview…</p>
                    ) : null}
                  </div>
                )}
              </div>
              {qr.qrDataUrl ? (
                <div className="no-print mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button type="button" onClick={downloadPng} className={btnSecondaryClass}>
                    Save as PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className={btnSecondaryClass}
                  >
                    Print QR
                  </button>
                </div>
              ) : null}
              {qr.qrDataUrl ? (
                <div className="no-print mt-4 border-t border-border pt-4">
                  <p className="text-xs font-medium text-foreground">Before you share</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] leading-relaxed text-muted">
                    <li>Scan with your own bank or wallet app and confirm payee details.</li>
                    <li>For wallets, verify phone, username, and amount (if fixed).</li>
                    <li>Re-generate if you change account, bank, or amount mode.</li>
                  </ul>
                </div>
              ) : null}
            </div>

            {qr.qrDataUrl ? (
              <div className="print-only print-sheet">
                <p className="text-lg font-semibold text-foreground">
                  {selectedBankOption?.name ?? "Payment QR"}
                </p>
                {form.name ? (
                  <p className="mt-1 text-sm text-muted">{form.name}</p>
                ) : null}
                {qr.amountInQr ? (
                  <p className="mt-1 text-sm font-medium text-foreground">{qr.amountInQr}</p>
                ) : (
                  <p className="mt-1 text-sm text-muted">Any amount</p>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr.qrDataUrl} alt="Payment QR code" width={280} height={280} className="mx-auto mt-4" />
              </div>
            ) : null}

            {qr.selectedBank && qr.payload ? (
              <div className={`no-print ${panelClass} text-sm`}>
                <dl className="space-y-2">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Amount</dt>
                    <dd className="text-foreground">{qr.amountInQr ?? "Any amount"}</dd>
                  </div>
                  {qr.remarkInQr ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Remark</dt>
                      <dd className="max-w-[60%] text-right text-foreground">{qr.remarkInQr}</dd>
                    </div>
                  ) : null}
                </dl>
                <p className="mt-4 border-t border-border pt-4 text-[11px] leading-relaxed text-muted">
                  Share the QR image with payers. Do not publish raw encoded strings.
                </p>
                <span data-testid="qr-payload" className="sr-only" aria-hidden>
                  {qr.payload}
                </span>
              </div>
            ) : null}
          </aside>
        </div>
        ) : null}

        {activeSection === "banks" ? (
          <section className="no-print mt-6 md:mt-8">
            <div className={`${panelClass} !p-0`}>
              <div className="border-b border-border p-3 sm:p-4">
                <input
                  type="search"
                  placeholder="Filter by name or BIC"
                  value={bankFilter}
                  onChange={(e) => setBankFilter(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <ul className="max-h-[min(70vh,28rem)] divide-y divide-border overflow-y-auto overscroll-contain lg:max-h-[calc(100vh-14rem)]">
                {filteredBanks.map((bank) => (
                  <li key={bank.bic}>
                    <button
                      type="button"
                      onClick={() => {
                        qr.pickBank(bank.bic);
                        setBankPickerOpen(false);
                        goToSection("create");
                      }}
                      className="flex min-h-12 w-full flex-col gap-2 px-3 py-3 text-left text-sm hover:bg-brand-soft active:bg-brand-soft sm:min-h-11 sm:flex-row sm:items-center sm:gap-3 sm:py-2.5"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <BankLogo bic={bank.bic} name={bank.name} size="sm" />
                        <span className="min-w-0 flex-1 text-foreground">
                          {bank.name}
                          {usesWalletPhone(bank) ? (
                            <span className="ml-1.5 text-[10px] font-normal text-muted">Wallet</span>
                          ) : null}
                        </span>
                      </div>
                      <span className="pl-10 font-mono text-[11px] text-muted sm:shrink-0 sm:pl-0 sm:text-xs">
                        {bank.bic}, code {bank.bankCode}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
