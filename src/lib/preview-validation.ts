import {
  BANKS,
  formatTransactionAmount,
  isCbeBirrWallet,
  isYayaWallet,
  type Bank,
} from "@/lib/ethiopian-bank-qr";
import { walletPhoneDigitsForTlv } from "@/lib/wallets/shared-phone";
import { normalizeYayaUsername, yayaLocalPhoneDigits } from "@/lib/wallets/yaya";
import type { PaymentQrFormState } from "@/lib/payment-form-state";

export function getPreviewBlockReason(
  form: PaymentQrFormState,
  bank: Bank | undefined = BANKS.find((b) => b.bic === form.bankBic),
): string | null {
  if (!bank) return "Select a bank to generate a QR.";
  if (!form.account.trim()) {
    return isCbeBirrWallet(bank) || isYayaWallet(bank)
      ? "Enter your wallet phone number."
      : "Enter the account number.";
  }
  if (!form.name.trim()) return "Enter the name on the account.";
  if (isYayaWallet(bank) && !form.yayaUsername.trim()) {
    return "Enter your Yaya username.";
  }
  if (form.amountMode === "fixed" && !form.amount.trim()) {
    return "Enter an amount or switch to any amount mode.";
  }

  try {
    if (form.amountMode === "fixed" && form.amount.trim()) {
      formatTransactionAmount(form.amount);
    }
    if (isCbeBirrWallet(bank) || isYayaWallet(bank)) {
      walletPhoneDigitsForTlv(form.account);
    }
    if (isYayaWallet(bank)) {
      normalizeYayaUsername(form.yayaUsername);
      yayaLocalPhoneDigits(form.account);
    }
    if (form.merchantGuid.trim()) {
      const g = form.merchantGuid.trim().replace(/-/g, "").toLowerCase();
      if (!/^[0-9a-f]{32}$/.test(g)) {
        return "Invalid payment identifier format.";
      }
    }
  } catch (e) {
    return e instanceof Error ? e.message : "Check your inputs.";
  }

  return null;
}
