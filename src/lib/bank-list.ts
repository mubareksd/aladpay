import type { Bank } from "@/lib/ethiopian-bank-qr";
import { BANKS, usesWalletPhone } from "@/lib/ethiopian-bank-qr";

function sortWalletsFirst(banks: readonly Bank[]): Bank[] {
  const wallets = banks.filter((b) => usesWalletPhone(b));
  const rest = banks.filter((b) => !usesWalletPhone(b));
  return [...wallets, ...rest];
}

/** Favorites, then wallets first when browsing without a search query. */
export function sortBanksForPicker(
  banks: readonly Bank[],
  query: string,
  favoriteBics: readonly string[] = [],
): Bank[] {
  const q = query.trim().toLowerCase();
  const list = q
    ? banks.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.bic.toLowerCase().includes(q) ||
          b.bankCode.includes(q),
      )
    : [...banks];
  if (q) return list;

  const favSet = new Set(favoriteBics);
  const favorites = favoriteBics
    .map((bic) => list.find((b) => b.bic === bic))
    .filter((b): b is Bank => Boolean(b));
  const rest = sortWalletsFirst(list.filter((b) => !favSet.has(b.bic)));
  return [...favorites, ...rest];
}

export { BANKS };
