import logos from "@/data/bank-logos.json";

const logoByBic = logos as Record<string, string>;

export function getBankLogoPath(bic: string): string | undefined {
  return logoByBic[bic];
}
