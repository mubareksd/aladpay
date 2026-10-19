import type { Bank } from "@/lib/ethiopian-bank-qr";
import { BANKS, usesWalletPhone } from "@/lib/ethiopian-bank-qr";

/** Wallets first when browsing without a search query. */
export function sortBanksForPicker(banks: readonly Bank[], query: string): Bank[] {
  const list = [...banks];
  const q = query.trim().toLowerCase();
  if (q) return list;
  const wallets = list.filter((b) => usesWalletPhone(b));
  const rest = list.filter((b) => !usesWalletPhone(b));
  return [...wallets, ...rest];
}

export { BANKS };
