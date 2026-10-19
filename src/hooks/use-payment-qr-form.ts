"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BANKS,
  buildPayload,
  formatTransactionAmount,
  isYayaWallet,
  usesWalletPhone,
  type Bank,
} from "@/lib/ethiopian-bank-qr";
import type { PayloadFormHints } from "@/lib/emv-qr-parse";
import {
  defaultPaymentQrForm,
  type PaymentQrFormState,
} from "@/lib/payment-form-state";
import { getPreviewBlockReason } from "@/lib/preview-validation";
import {
  formFieldsToSavedAccount,
  savedAccountToFormFields,
  type SavedAccount,
} from "@/lib/saved-accounts";

export type { AmountMode, PaymentQrFormState } from "@/lib/payment-form-state";
export { defaultPaymentQrForm } from "@/lib/payment-form-state";

export function usePaymentQrForm() {
  const [form, setForm] = useState<PaymentQrFormState>(defaultPaymentQrForm);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [amountInQr, setAmountInQr] = useState<string | null>(null);
  const [remarkInQr, setRemarkInQr] = useState<string | null>(null);
  const [poiInQr, setPoiInQr] = useState<string | null>(null);
  const [livePreview, setLivePreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const generateSeq = useRef(0);

  const clearPreview = useCallback(() => {
    setPayload(null);
    setQrDataUrl(null);
    setSelectedBank(null);
    setAmountInQr(null);
    setRemarkInQr(null);
    setPoiInQr(null);
  }, []);

  const updateField = useCallback(
    <K extends keyof PaymentQrFormState>(key: K, value: PaymentQrFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    [],
  );

  const effectiveAmount = useCallback((fields: PaymentQrFormState) => {
    return fields.amountMode === "fixed" ? fields.amount : "";
  }, []);

  const runGenerate = useCallback(
    async (
      fields: PaymentQrFormState,
      amountValue: string,
      options?: { clearFirst?: boolean },
    ) => {
      const clearFirst = options?.clearFirst !== false;
      const seq = ++generateSeq.current;

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
          yayaTag62Encoding: fields.yayaTag62Encoding,
        });
        if (seq !== generateSeq.current) return;

        const dataUrl = await QRCode.toDataURL(nextPayload, {
          errorCorrectionLevel: "M",
          margin: 4,
          width: 300,
          color: { dark: "#000000", light: "#ffffff" },
        });
        if (seq !== generateSeq.current) return;

        setPayload(nextPayload);
        setQrDataUrl(dataUrl);
        setSelectedBank(bank);
        const formattedAmount = formatTransactionAmount(amountValue || undefined);
        setAmountInQr(formattedAmount ? `${formattedAmount} ETB` : null);
        setPoiInQr(formattedAmount ? "Fixed amount (POI 12)" : "Any amount (POI 11)");
        setRemarkInQr(fields.remark.trim() || null);
        setPreviewError(null);
        if (!clearFirst) setError(null);
      } catch (e) {
        if (seq !== generateSeq.current) return;
        const message = e instanceof Error ? e.message : "Could not build the QR.";
        if (clearFirst) {
          setError(message);
        } else {
          setPreviewError(message);
        }
      }
    },
    [clearPreview],
  );

  const previewBlockReason = useMemo(() => {
    const bank = BANKS.find((b) => b.bic === form.bankBic);
    return getPreviewBlockReason(form, bank);
  }, [form]);

  useEffect(() => {
    if (!livePreview || previewBlockReason) return;

    const amount = effectiveAmount(form);
    const timer = window.setTimeout(() => {
      void runGenerate(form, amount, { clearFirst: false });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [effectiveAmount, form, livePreview, previewBlockReason, runGenerate]);

  const generate = useCallback(async () => {
    await runGenerate(form, effectiveAmount(form));
  }, [effectiveAmount, form, runGenerate]);

  const generateOpenAmount = useCallback(async () => {
    const fields: PaymentQrFormState = { ...form, amountMode: "any", amount: "" };
    setForm(fields);
    await runGenerate(fields, "");
  }, [form, runGenerate]);

  const applyPayloadHints = useCallback((hints: PayloadFormHints | null) => {
    if (!hints) return;
    setForm((prev) => ({
      ...prev,
      bankBic: hints.bankBic,
      account: hints.account,
      name: hints.name,
      amount: hints.amount,
      amountMode: hints.amount.trim() ? "fixed" : "any",
      remark: hints.remark,
      city: hints.city,
      merchantGuid: hints.merchantGuid,
      yayaUsername: hints.yayaUsername,
      encoding: hints.encoding,
    }));
    setError(null);
  }, []);

  const applyMerchantGuid = useCallback((guid: string) => {
    setForm((prev) => ({ ...prev, merchantGuid: guid }));
  }, []);

  const pickBank = useCallback((bic: string) => {
    const bank = BANKS.find((b) => b.bic === bic);
    setForm((prev) => ({
      ...prev,
      bankBic: bic,
      encoding: bank && usesWalletPhone(bank) ? "ips" : prev.encoding,
      yayaTag62Encoding:
        bank && isYayaWallet(bank) ? prev.yayaTag62Encoding : "standard",
    }));
    setError(null);
  }, []);

  const loadSavedAccount = useCallback(
    (account: SavedAccount) => {
      const bank = BANKS.find((b) => b.bic === account.bankBic);
      const fields = savedAccountToFormFields(account);
      setForm({
        ...fields,
        amount: "",
        amountMode: "any",
        remark: "",
        yayaUsername: fields.yayaUsername ?? "",
        yayaTag62Encoding: fields.yayaTag62Encoding ?? "standard",
        encoding: bank && usesWalletPhone(bank) ? "ips" : fields.encoding,
      });
      clearPreview();
      setError(null);
    },
    [clearPreview],
  );

  const buildSavedFields = useCallback(
    () => ({
      bankBic: form.bankBic,
      account: form.account,
      name: form.name,
      phone: form.phone,
      till: form.till,
      city: form.city,
      encoding: form.encoding,
      merchantGuid: form.merchantGuid,
      yayaUsername: form.yayaUsername,
      yayaTag62Encoding: form.yayaTag62Encoding,
      accountType: BANKS.find((b) => b.bic === form.bankBic)?.accountType,
    }),
    [form],
  );

  const formStateForQuickQr = useCallback(
    (account: SavedAccount, amount: string, remark: string): PaymentQrFormState => {
      const savedFields = savedAccountToFormFields(account);
      return {
        ...savedFields,
        yayaUsername: savedFields.yayaUsername ?? "",
        amount,
        amountMode: amount.trim() ? "fixed" : "any",
        remark,
        yayaTag62Encoding: savedFields.yayaTag62Encoding ?? "standard",
      };
    },
    [],
  );

  return {
    form,
    setForm,
    error,
    setError,
    payload,
    qrDataUrl,
    selectedBank,
    amountInQr,
    remarkInQr,
    poiInQr,
    previewBlockReason,
    previewError,
    livePreview,
    setLivePreview,
    clearPreview,
    updateField,
    effectiveAmount,
    runGenerate,
    generate,
    generateOpenAmount,
    applyPayloadHints,
    applyMerchantGuid,
    pickBank,
    loadSavedAccount,
    buildSavedFields,
    formStateForQuickQr,
    formFieldsToSavedAccount,
  };
}
