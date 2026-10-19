import { BANKS, formatTransactionAmount, isCbeBirrWallet, isYayaWallet } from "@/lib/ethiopian-bank-qr";
import type { PaymentQrFormState } from "@/lib/payment-form-state";
import {
  normalizeYayaUsername,
  yayaLocalPhoneDigits,
} from "@/lib/wallets/yaya";
import { walletPhoneDigitsForTlv } from "@/lib/wallets/shared-phone";

export type ValidatedFormField =
  | "account"
  | "name"
  | "amount"
  | "yayaUsername"
  | "merchantGuid";

export function getFormFieldError(
  form: PaymentQrFormState,
  field: ValidatedFormField,
): string | null {
  const bank = BANKS.find((b) => b.bic === form.bankBic);
  if (!bank) return null;

  try {
    switch (field) {
      case "account":
        if (!form.account.trim()) {
          return isCbeBirrWallet(bank) || isYayaWallet(bank)
            ? "Wallet phone is required."
            : "Account number is required.";
        }
        if (isCbeBirrWallet(bank) || isYayaWallet(bank)) {
          walletPhoneDigitsForTlv(form.account);
          if (isYayaWallet(bank)) yayaLocalPhoneDigits(form.account);
        }
        return null;
      case "name":
        return form.name.trim() ? null : "Name is required.";
      case "amount":
        if (form.amountMode !== "fixed") return null;
        if (!form.amount.trim()) return "Enter an amount.";
        formatTransactionAmount(form.amount);
        return null;
      case "yayaUsername":
        if (!isYayaWallet(bank)) return null;
        if (!form.yayaUsername.trim()) return "Yaya username is required.";
        normalizeYayaUsername(form.yayaUsername);
        return null;
      case "merchantGuid":
        if (!form.merchantGuid.trim()) return null;
        const g = form.merchantGuid.trim().replace(/-/g, "").toLowerCase();
        if (!/^[0-9a-f]{32}$/.test(g)) {
          return "Invalid payment identifier format.";
        }
        return null;
      default:
        return null;
    }
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid value.";
  }
}
