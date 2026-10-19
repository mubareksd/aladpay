import type { MenuItem, PosPaymentSettings, PosState, PosTable } from "@/lib/pos/types";

const now = () => Date.now();

export function defaultPaymentSettings(): PosPaymentSettings {
  return {
    savedAccountId: null,
    aladBank: "boa",
    accountNumber: "",
    accountName: "",
  };
}

export function seedTables(): PosTable[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: crypto.randomUUID(),
    label: `Table ${i + 1}`,
    seats: 4,
    status: "available" as const,
    updatedAt: now(),
  }));
}

export function seedMenu(): MenuItem[] {
  const items: Omit<MenuItem, "id" | "updatedAt">[] = [
    { name: "Macchiato", price: 80, category: "Drinks", station: "bar", available: true },
    { name: "Spris", price: 90, category: "Drinks", station: "bar", available: true },
    { name: "Burger", price: 350, category: "Food", station: "kitchen", available: true },
    { name: "Firfir", price: 220, category: "Food", station: "kitchen", available: true },
    { name: "Water 1L", price: 40, category: "Drinks", station: "bar", available: true },
  ];
  return items.map((item) => ({ ...item, id: crypto.randomUUID(), updatedAt: now() }));
}

export function defaultPosState(): PosState {
  return {
    venueName: "My restaurant",
    tables: seedTables(),
    menuItems: seedMenu(),
    orders: [],
    payment: defaultPaymentSettings(),
  };
}
