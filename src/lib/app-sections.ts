export type AppSection = "create" | "saved" | "decoder" | "banks";

export type AppNavItem = {
  id: AppSection;
  label: string;
  shortLabel: string;
  description: string;
};

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  {
    id: "create",
    label: "Create QR",
    shortLabel: "Create",
    description: "Build and preview a payment QR for your bank or wallet.",
  },
  {
    id: "saved",
    label: "Saved accounts",
    shortLabel: "Saved",
    description: "Store accounts and generate QRs with one tap.",
  },
  {
    id: "decoder",
    label: "Payload decoder",
    shortLabel: "Decode",
    description: "Paste or scan a QR string to inspect tags and compare with your preview.",
  },
  {
    id: "banks",
    label: "All banks",
    shortLabel: "Banks",
    description: "Browse supported Ethiopian banks and wallets.",
  },
] as const;

export function sectionMeta(id: AppSection): AppNavItem {
  return APP_NAV_ITEMS.find((item) => item.id === id) ?? APP_NAV_ITEMS[0];
}
