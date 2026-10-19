export type AppSection = "create" | "saved" | "pos" | "verify" | "decoder" | "banks";

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
    id: "pos",
    label: "Tables & orders",
    shortLabel: "Orders",
    description: "Manage tables, menu, and orders — accept checkout payment when a bill is ready.",
  },
  {
    id: "verify",
    label: "Verify payment",
    shortLabel: "Verify",
    description: "Confirm a customer transfer using a receipt link or reference.",
  },
  {
    id: "decoder",
    label: "Import from QR",
    shortLabel: "Import",
    description: "Photograph an existing payment QR to fill in payee details.",
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
